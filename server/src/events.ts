import { z } from "zod";
import { query } from "./db.ts";

export const EVENT_TYPES = ["conference", "meetup", "workshop", "hackathon"] as const;

const optionalText = z.string().trim().max(2000).optional().nullable();
const optionalNumber = z.number().finite().optional().nullable();

/** Input shape (camelCase, same as the frontend's DevEvent minus id). */
export const eventInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  time: z.string().trim().max(20).default("09:00"),
  location: z.string().trim().max(500).default("Online"),
  type: z.enum(EVENT_TYPES).default("meetup"),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  url: optionalText,
  continent: optionalText,
  country: optionalText,
  city: optionalText,
  latitude: optionalNumber,
  longitude: optionalNumber,
  feeAmount: optionalNumber,
  feeAmountMax: optionalNumber,
  feeCurrency: z.string().trim().max(10).optional().nullable(),
  feeIsFree: z.boolean().optional().nullable(),
});
export type EventInput = z.infer<typeof eventInputSchema>;

// camelCase field -> db column
const COLUMNS: Record<keyof EventInput, string> = {
  title: "title",
  description: "description",
  date: "date",
  time: "time",
  location: "location",
  type: "type",
  tags: "tags",
  url: "url",
  continent: "continent",
  country: "country",
  city: "city",
  latitude: "latitude",
  longitude: "longitude",
  feeAmount: "fee_amount",
  feeAmountMax: "fee_amount_max",
  feeCurrency: "fee_currency",
  feeIsFree: "fee_is_free",
};

const NOT_NULL = new Set<keyof EventInput>(["title", "description", "date", "time", "location", "type", "tags"]);

function toDbValue(key: keyof EventInput, value: unknown) {
  if (NOT_NULL.has(key)) return value;
  if (value === undefined || value === "") return null;
  if (key === "feeCurrency" && typeof value === "string") return value.toUpperCase();
  return value;
}

export function mapEventRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    type: row.type,
    tags: row.tags ?? [],
    url: row.url ?? undefined,
    continent: row.continent ?? undefined,
    country: row.country ?? undefined,
    city: row.city ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    feeAmount: row.fee_amount ?? undefined,
    feeAmountMax: row.fee_amount_max ?? undefined,
    feeCurrency: row.fee_currency ?? undefined,
    feeIsFree: row.fee_is_free ?? undefined,
  };
}
export type DevEvent = ReturnType<typeof mapEventRow>;

export async function listEvents(ids?: string[]) {
  const { rows } = ids
    ? await query("SELECT * FROM events WHERE id = ANY($1::uuid[]) ORDER BY date, time", [ids])
    : await query("SELECT * FROM events ORDER BY date, time");
  return rows.map(mapEventRow);
}

export async function getEvent(id: string) {
  const { rows } = await query("SELECT * FROM events WHERE id = $1", [id]);
  return rows[0] ? mapEventRow(rows[0]) : null;
}

/** Inserts an event. Returns null when an event with the same title+date already exists. */
export async function insertEvent(input: EventInput): Promise<DevEvent | null> {
  const keys = Object.keys(COLUMNS) as (keyof EventInput)[];
  const cols = keys.map((k) => COLUMNS[k]);
  const values = keys.map((k) => toDbValue(k, input[k]));
  const { rows } = await query(
    `INSERT INTO events (${cols.join(", ")})
     VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})
     ON CONFLICT (lower(title), date) DO NOTHING
     RETURNING *`,
    values,
  );
  return rows[0] ? mapEventRow(rows[0]) : null;
}

export async function updateEvent(id: string, updates: Partial<EventInput>) {
  const keys = (Object.keys(updates) as (keyof EventInput)[]).filter(
    (k) => k in COLUMNS && updates[k] !== undefined,
  );
  if (keys.length === 0) return getEvent(id);
  const sets = keys.map((k, i) => `${COLUMNS[k]} = $${i + 2}`);
  const { rows } = await query(
    `UPDATE events SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    [id, ...keys.map((k) => toDbValue(k, updates[k]))],
  );
  return rows[0] ? mapEventRow(rows[0]) : null;
}

export async function deleteEvent(id: string) {
  const { rowCount } = await query("DELETE FROM events WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Inserts many events, skipping past ones and duplicates. */
export async function importEvents(events: EventInput[]) {
  const today = todayIso();
  let imported = 0;
  let duplicates = 0;
  let past = 0;
  for (const ev of events) {
    if (ev.date < today) {
      past++;
      continue;
    }
    if (await insertEvent(ev)) imported++;
    else duplicates++;
  }
  return { imported, duplicates, past };
}
