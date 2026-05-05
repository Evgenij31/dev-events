import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTINENT_BY_CC: Record<string, string> = {
  US: "North America", CA: "North America", MX: "North America", GT: "North America", CR: "North America", PA: "North America", CU: "North America", DO: "North America",
  BR: "South America", AR: "South America", CL: "South America", CO: "South America", PE: "South America", VE: "South America", UY: "South America", BO: "South America", EC: "South America", PY: "South America",
  GB: "Europe", IE: "Europe", FR: "Europe", DE: "Europe", ES: "Europe", PT: "Europe", IT: "Europe", NL: "Europe", BE: "Europe", LU: "Europe", CH: "Europe", AT: "Europe", PL: "Europe", CZ: "Europe", SK: "Europe", HU: "Europe", RO: "Europe", BG: "Europe", GR: "Europe", SE: "Europe", NO: "Europe", FI: "Europe", DK: "Europe", IS: "Europe", EE: "Europe", LV: "Europe", LT: "Europe", UA: "Europe", BY: "Europe", MD: "Europe", RU: "Europe", RS: "Europe", HR: "Europe", SI: "Europe", BA: "Europe", AL: "Europe", MK: "Europe", ME: "Europe", XK: "Europe", TR: "Europe",
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", PK: "Asia", BD: "Asia", LK: "Asia", NP: "Asia", TH: "Asia", VN: "Asia", PH: "Asia", ID: "Asia", MY: "Asia", SG: "Asia", HK: "Asia", TW: "Asia", AE: "Asia", SA: "Asia", QA: "Asia", KW: "Asia", BH: "Asia", OM: "Asia", IL: "Asia", JO: "Asia", LB: "Asia", IR: "Asia", IQ: "Asia", AF: "Asia", KZ: "Asia", UZ: "Asia",
  EG: "Africa", ZA: "Africa", NG: "Africa", KE: "Africa", MA: "Africa", TN: "Africa", DZ: "Africa", ET: "Africa", GH: "Africa", UG: "Africa", TZ: "Africa", SN: "Africa", CI: "Africa", CM: "Africa",
  AU: "Oceania", NZ: "Oceania", FJ: "Oceania", PG: "Oceania",
};

function isOnline(loc: string): boolean {
  const l = (loc || "").toLowerCase();
  return !l.trim() || l === "online" || l.includes("online") || l.includes("virtual") || l.includes("remote");
}

async function geocode(location: string) {
  if (isOnline(location)) {
    return { latitude: null, longitude: null, city: "Online", country: "Online", continent: "Online" };
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(location)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "lovable-dev-events/1.0", "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const r = data[0];
    const addr = r.address || {};
    const cc = (addr.country_code || "").toUpperCase();
    return {
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      city: addr.city || addr.town || addr.village || addr.municipality || addr.county || null,
      country: addr.country || null,
      continent: CONTINENT_BY_CC[cc] || null,
    };
  } catch (e) {
    console.error("geocode error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ error: scrapeData.error || "Failed to scrape page" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    if (!markdown) {
      return new Response(JSON.stringify({ error: "No content found on page" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Scraped content length:", markdown.length);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at extracting developer event information from web content. Extract all events you can find. For each event, determine the type (conference, meetup, workshop, or hackathon), relevant tags, the registration/event URL if available, and region info (continent, country, city, plus approximate latitude/longitude of the city). For virtual events, set continent/country/city to 'Online' and omit coordinates.",
          },
          {
            role: "user",
            content: `Extract all developer events from the following web content. If dates are relative, assume the current year is 2026.\n\n${markdown.slice(0, 15000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_events",
              description: "Extract developer events from web content",
              parameters: {
                type: "object",
                properties: {
                  events: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Event title" },
                        description: { type: "string", description: "Brief event description" },
                        date: { type: "string", description: "Date in YYYY-MM-DD format" },
                        time: { type: "string", description: "Start time in HH:MM format, default 09:00" },
                        location: { type: "string", description: "Event location or 'Online'" },
                        type: { type: "string", enum: ["conference", "meetup", "workshop", "hackathon"] },
                        tags: { type: "array", items: { type: "string" }, description: "Relevant technology tags" },
                        url: { type: "string", description: "Registration or event page URL, if available" },
                        continent: { type: "string", description: "Continent: Africa, Antarctica, Asia, Europe, North America, Oceania, or South America. Use 'Online' if virtual." },
                        country: { type: "string", description: "Country name in English, or 'Online' if virtual." },
                        city: { type: "string", description: "City name, or 'Online' if virtual." },
                        latitude: { type: "number", description: "Approximate latitude of the event city. Omit if online or unknown." },
                        longitude: { type: "number", description: "Approximate longitude of the event city. Omit if online or unknown." },
                      },
                      required: ["title", "description", "date", "time", "location", "type", "tags"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["events"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_events" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const today = new Date().toISOString().split("T")[0];
    const futureEvents = (extracted.events || []).filter((ev: any) => ev.date >= today);
    console.log(`Extracted ${extracted.events?.length || 0} events, ${futureEvents.length} are future/current`);

    // Enrich missing geo info
    for (const ev of futureEvents) {
      const hasCoords = typeof ev.latitude === "number" && typeof ev.longitude === "number";
      if (hasCoords && ev.continent && ev.country) continue;
      const geo = await geocode(ev.location || "");
      if (geo) {
        ev.latitude = ev.latitude ?? geo.latitude;
        ev.longitude = ev.longitude ?? geo.longitude;
        ev.city = ev.city || geo.city;
        ev.country = ev.country || geo.country;
        ev.continent = ev.continent || geo.continent;
      }
      if (!isOnline(ev.location || "")) await new Promise((r) => setTimeout(r, 1100));
    }

    return new Response(JSON.stringify({ events: futureEvents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scrape-events error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
