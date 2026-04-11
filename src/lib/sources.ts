import { supabase } from "@/integrations/supabase/client";

export interface ScrapeSource {
  id: string;
  name: string;
  url: string;
  lastScraped: string | null;
}

export async function getSources(): Promise<ScrapeSource[]> {
  const { data, error } = await supabase
    .from("scrape_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sources:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    lastScraped: row.last_scraped,
  }));
}

export async function addSource(name: string, url: string): Promise<ScrapeSource | null> {
  const { data, error } = await supabase
    .from("scrape_sources")
    .insert({ name, url })
    .select()
    .single();

  if (error) {
    console.error("Error adding source:", error);
    return null;
  }

  return { id: data.id, name: data.name, url: data.url, lastScraped: data.last_scraped };
}

export async function deleteSource(id: string) {
  const { error } = await supabase.from("scrape_sources").delete().eq("id", id);
  if (error) console.error("Error deleting source:", error);
}

export async function updateSourceLastScraped(id: string) {
  const { error } = await supabase
    .from("scrape_sources")
    .update({ last_scraped: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("Error updating source:", error);
}
