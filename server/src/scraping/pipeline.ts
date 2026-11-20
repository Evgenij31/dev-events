// Scrape a page (Firecrawl) -> extract structured data (OpenAI-compatible chat
// completions with a forced tool call) -> enrich with geocoding.
// Ported from the old Supabase edge functions (scrape-events,
// auto-scrape-events, backfill-event-fees).
import { config } from "../config.ts";
import { HttpError } from "../http.ts";
import { EVENT_TYPES, todayIso, type EventInput } from "../events.ts";
import { geocode } from "./geocode.ts";

export function assertScrapingConfigured() {
  if (!config.firecrawlApiKey) throw new HttpError(503, "Scraping is not configured: set FIRECRAWL_API_KEY in server/.env");
  if (!config.aiApiKey) throw new HttpError(503, "AI extraction is not configured: set AI_API_KEY in server/.env");
}

export function normalizeUrl(url: string) {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function scrapeMarkdown(url: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.firecrawlApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: normalizeUrl(url), formats: ["markdown"], onlyMainContent: true }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    console.error("Firecrawl error:", res.status, data);
    throw new HttpError(502, data.error || "Failed to scrape page");
  }
  const markdown: string = data.data?.markdown || data.markdown || "";
  if (!markdown) throw new HttpError(400, "No content found on page");
  return markdown;
}

async function callTool<T>(system: string, user: string, name: string, parameters: object): Promise<T> {
  const res = await fetch(`${config.aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.aiApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.aiModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [{ type: "function", function: { name, description: name, parameters } }],
      tool_choice: { type: "function", function: { name } },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new HttpError(429, "AI rate limited, please try again later.");
    if (res.status === 402) throw new HttpError(502, "AI credits exhausted.");
    console.error("AI error:", res.status, await res.text());
    throw new HttpError(502, "AI extraction failed");
  }
  const data: any = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new HttpError(502, "AI did not return structured data");
  try {
    return JSON.parse(args) as T;
  } catch {
    throw new HttpError(502, "AI returned malformed data");
  }
}

const FEE_INSTRUCTIONS =
  "For fees: if the event is explicitly free, set fee_is_free=true. If paid ticket prices are shown, return the LOWEST price as fee_amount and the HIGHEST as fee_amount_max (omit fee_amount_max if there is only one tier), with the ISO 4217 fee_currency (e.g. USD, EUR, GBP). Consider all ticket tiers / early-bird / VIP options. If no fee information is available, omit all fee fields.";

const FEE_PROPERTIES = {
  fee_is_free: { type: "boolean", description: "True if explicitly free. Omit if unknown." },
  fee_amount: { type: "number", description: "Lowest price. Omit if free or unknown." },
  fee_amount_max: { type: "number", description: "Highest price when multiple tiers exist." },
  fee_currency: { type: "string", description: "ISO 4217 code for the price." },
};

const EVENT_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string", description: "Brief event description" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "Start time HH:MM, default 09:00" },
          location: { type: "string", description: "Event location or 'Online'" },
          type: { type: "string", enum: EVENT_TYPES },
          tags: { type: "array", items: { type: "string" }, description: "Relevant technology tags" },
          url: { type: "string", description: "Registration or event page URL, if available" },
          continent: { type: "string", description: "Africa, Antarctica, Asia, Europe, North America, Oceania, South America, or 'Online'" },
          country: { type: "string", description: "Country name in English, or 'Online'" },
          city: { type: "string", description: "City name, or 'Online'" },
          latitude: { type: "number", description: "Approx. latitude of the city; omit if online/unknown" },
          longitude: { type: "number", description: "Approx. longitude of the city; omit if online/unknown" },
          ...FEE_PROPERTIES,
        },
        required: ["title", "description", "date", "time", "location", "type", "tags"],
      },
    },
  },
  required: ["events"],
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Extracts upcoming events from a page and fills in missing geo data. */
export async function extractEvents(markdown: string): Promise<EventInput[]> {
  const { events = [] } = await callTool<{ events?: any[] }>(
    "You are an expert at extracting developer event information from web content. Extract all events you can find. " +
      "For each event, determine the type (conference, meetup, workshop, or hackathon), relevant tags, the registration/event URL if available, " +
      "region info (continent, country, city, plus approximate latitude/longitude of the city), and fee/ticket-price information. " +
      "For virtual events, set continent/country/city to 'Online' and omit coordinates. " +
      FEE_INSTRUCTIONS,
    `Extract all developer events from the following web content. If dates are relative, assume the current year is ${new Date().getFullYear()}.\n\n${markdown.slice(0, 15000)}`,
    "extract_events",
    EVENT_SCHEMA,
  );

  const today = todayIso();
  const result: EventInput[] = [];
  for (const ev of events) {
    if (!str(ev.title) || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date ?? "") || ev.date < today) continue;
    const out: EventInput = {
      title: str(ev.title)!,
      description: str(ev.description) ?? "",
      date: ev.date,
      time: str(ev.time) ?? "09:00",
      location: str(ev.location) ?? "Online",
      type: EVENT_TYPES.includes(ev.type) ? ev.type : "meetup",
      tags: Array.isArray(ev.tags) ? ev.tags.filter((t: unknown) => typeof t === "string" && t.trim()).slice(0, 30) : [],
      url: str(ev.url),
      continent: str(ev.continent),
      country: str(ev.country),
      city: str(ev.city),
      latitude: num(ev.latitude),
      longitude: num(ev.longitude),
      feeIsFree: typeof ev.fee_is_free === "boolean" ? ev.fee_is_free : null,
      feeAmount: num(ev.fee_amount),
      feeAmountMax: num(ev.fee_amount_max),
      feeCurrency: str(ev.fee_currency)?.toUpperCase() ?? null,
    };
    const hasCoords = out.latitude != null && out.longitude != null;
    if (!hasCoords || !out.continent || !out.country) {
      const geo = await geocode(out.location);
      if (geo) {
        out.latitude ??= geo.latitude;
        out.longitude ??= geo.longitude;
        out.city ||= geo.city;
        out.country ||= geo.country;
        out.continent ||= geo.continent;
      }
    }
    result.push(out);
  }
  return result;
}

export interface FeeInfo {
  fee_is_free?: boolean;
  fee_amount?: number;
  fee_amount_max?: number;
  fee_currency?: string;
}

export function extractFee(markdown: string) {
  return callTool<FeeInfo>(
    "You extract ticket/registration fee info from an event web page. " + FEE_INSTRUCTIONS,
    markdown.slice(0, 15000),
    "extract_fee",
    { type: "object", properties: FEE_PROPERTIES },
  );
}
