import { api } from "@/lib/api.ts";
import { DevEvent } from "@/lib/events.ts";

export type ScrapedEvent = Omit<DevEvent, "id">;

/** Scrapes a page for events (admin only). Passing sourceId also bumps that source's lastScraped. */
export async function scrapeEventsFromUrl(url: string, sourceId?: string): Promise<ScrapedEvent[]> {
  const { events } = await api<{ events: ScrapedEvent[] }>("/admin/scrape", {
    body: { url, sourceId },
    auth: "admin",
  });
  return events;
}

export function backfillEventFees(limit = 20) {
  return api<{ processed: number; updated: number; failed: number; remaining: boolean }>(
    "/admin/backfill-fees",
    { body: { limit }, auth: "admin" },
  );
}
