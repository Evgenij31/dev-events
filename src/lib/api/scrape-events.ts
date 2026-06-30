import { supabaseData } from "@/integrations/supabase/dataClient.ts";
import { DevEvent } from "@/lib/events.ts";

export type ScrapedEvent = Omit<DevEvent, "id">;

export async function scrapeEventsFromUrl(url: string): Promise<ScrapedEvent[]> {
  const { data, error } = await supabaseData.functions.invoke("scrape-events", {
    body: { url },
  });

  if (error) {
    throw new Error(error.message || "Failed to scrape events");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.events || [];
}
