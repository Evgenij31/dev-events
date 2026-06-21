import { supabaseData } from "@/integrations/supabase/dataClient";

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

const ADMIN_PASSWORD = "admin123";

function mapRow(row: any): DevEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    type: row.type,
    tags: row.tags || [],
    url: row.url || undefined,
    continent: row.continent || undefined,
    country: row.country || undefined,
    city: row.city || undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    feeAmount: row.fee_amount != null ? Number(row.fee_amount) : undefined,
    feeCurrency: row.fee_currency || undefined,
    feeIsFree: row.fee_is_free ?? undefined,
  };
}

export async function getEvents(): Promise<DevEvent[]> {
  const { data, error } = await supabaseData
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function addEvent(event: Omit<DevEvent, "id">): Promise<DevEvent | null> {
  const { data, error } = await supabaseData
    .from("events")
    .insert({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      type: event.type,
      tags: event.tags,
      url: event.url || null,
      continent: event.continent || null,
      country: event.country || null,
      city: event.city || null,
      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,
      fee_amount: event.feeAmount ?? null,
      fee_currency: event.feeCurrency || null,
      fee_is_free: event.feeIsFree ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding event:", error);
    return null;
  }
  return mapRow(data);
}

export async function updateEvent(id: string, updates: Partial<DevEvent>) {
  const { error } = await supabaseData
    .from("events")
    .update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.date !== undefined && { date: updates.date }),
      ...(updates.time !== undefined && { time: updates.time }),
      ...(updates.location !== undefined && { location: updates.location }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.tags !== undefined && { tags: updates.tags }),
      ...(updates.url !== undefined && { url: updates.url || null }),
      ...(updates.continent !== undefined && { continent: updates.continent || null }),
      ...(updates.country !== undefined && { country: updates.country || null }),
      ...(updates.city !== undefined && { city: updates.city || null }),
      ...(updates.latitude !== undefined && { latitude: updates.latitude ?? null }),
      ...(updates.longitude !== undefined && { longitude: updates.longitude ?? null }),
      ...(updates.feeAmount !== undefined && { fee_amount: updates.feeAmount ?? null }),
      ...(updates.feeCurrency !== undefined && { fee_currency: updates.feeCurrency || null }),
      ...(updates.feeIsFree !== undefined && { fee_is_free: updates.feeIsFree ?? null }),
    })
    .eq("id", id);

  if (error) console.error("Error updating event:", error);
}

export async function deleteEvent(id: string) {
  const { error } = await supabaseData.from("events").delete().eq("id", id);
  if (error) console.error("Error deleting event:", error);
}

export async function checkDuplicate(title: string, date: string): Promise<boolean> {
  const { data } = await supabaseData
    .from("events")
    .select("id")
    .ilike("title", title)
    .eq("date", date)
    .limit(1);
  return (data?.length || 0) > 0;
}

export function verifyAdmin(password: string): boolean {
  return password === ADMIN_PASSWORD;
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
