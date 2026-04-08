export interface ScrapeSource {
  id: string;
  name: string;
  url: string;
  lastScraped: string | null;
}

const SOURCES_KEY = "devevents_sources";

export function getSources(): ScrapeSource[] {
  const stored = localStorage.getItem(SOURCES_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveSources(sources: ScrapeSource[]) {
  localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
}

export function addSource(name: string, url: string): ScrapeSource {
  const sources = getSources();
  const source: ScrapeSource = { id: Date.now().toString(), name, url, lastScraped: null };
  sources.push(source);
  saveSources(sources);
  return source;
}

export function deleteSource(id: string) {
  saveSources(getSources().filter((s) => s.id !== id));
}

export function updateSourceLastScraped(id: string) {
  const sources = getSources();
  const idx = sources.findIndex((s) => s.id === id);
  if (idx !== -1) {
    sources[idx].lastScraped = new Date().toISOString();
    saveSources(sources);
  }
}
