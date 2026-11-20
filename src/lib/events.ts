import { api, tokens } from "@/lib/api.ts";

export interface DevEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: "conference" | "meetup" | "workshop" | "hackathon";
  tags: string[];
  url?: string;
  continent?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  feeAmount?: number;
  feeAmountMax?: number;
  feeCurrency?: string;
  feeIsFree?: boolean;
}

export type EventInput = Omit<DevEvent, "id">;

/** Public list of all events. Returns [] (and logs) if the API is unreachable. */
export async function getEvents(): Promise<DevEvent[]> {
  try {
    return await api<DevEvent[]>("/events");
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export async function getEventsByIds(ids: string[]): Promise<DevEvent[]> {
  if (ids.length === 0) return [];
  return api<DevEvent[]>(`/events?ids=${ids.map(encodeURIComponent).join(",")}`);
}

// ---- Admin-only (require an admin session, see adminSignIn) ----

export async function adminSignIn(password: string): Promise<void> {
  const { token } = await api<{ token: string }>("/admin/session", { body: { password } });
  tokens.setAdmin(token);
}

export function adminSignOut() {
  tokens.setAdmin(null);
}

export function hasAdminSession(): boolean {
  return !!tokens.admin();
}

export function addEvent(event: EventInput): Promise<DevEvent> {
  return api<DevEvent>("/events", { body: event, auth: "admin" });
}

export function updateEvent(id: string, updates: Partial<EventInput>): Promise<DevEvent> {
  return api<DevEvent>(`/events/${id}`, { method: "PATCH", body: updates, auth: "admin" });
}

export function deleteEvent(id: string): Promise<void> {
  return api(`/events/${id}`, { method: "DELETE", auth: "admin" });
}

/** Bulk insert; the server skips past events and title+date duplicates. */
export function importEvents(events: EventInput[]) {
  return api<{ imported: number; duplicates: number; past: number }>("/events/import", {
    body: { events },
    auth: "admin",
  });
}

// Haversine distance in km
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
