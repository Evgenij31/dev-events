import { api } from "@/lib/api.ts";

export interface ScrapeSource {
  id: string;
  name: string;
  url: string;
  lastScraped: string | null;
}

export function getSources(): Promise<ScrapeSource[]> {
  return api<ScrapeSource[]>("/sources", { auth: "admin" });
}

export function addSource(name: string, url: string): Promise<ScrapeSource> {
  return api<ScrapeSource>("/sources", { body: { name, url }, auth: "admin" });
}

export function deleteSource(id: string): Promise<void> {
  return api(`/sources/${id}`, { method: "DELETE", auth: "admin" });
}
