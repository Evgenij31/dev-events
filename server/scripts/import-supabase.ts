// One-off: copy events (public read) from the hosted Supabase project into the
// local database. Uses VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from
// the root .env. Existing title+date duplicates are skipped.
//   npm run db:import-supabase
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
try {
  process.loadEnvFile(path.join(repoRoot, ".env"));
} catch {
  // fall through to the env check below
}

const { pool } = await import("../src/db.ts");
const { insertEvent, mapEventRow } = await import("../src/events.ts");

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/events?select=*&order=date.asc`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) {
  console.error(`Supabase returned ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const rows = (await res.json()) as any[];

let imported = 0;
for (const row of rows) {
  const ev = mapEventRow({
    ...row,
    fee_amount: row.fee_amount != null ? Number(row.fee_amount) : null,
    fee_amount_max: row.fee_amount_max != null ? Number(row.fee_amount_max) : null,
  });
  const { id: _id, ...input } = ev;
  if (await insertEvent(input)) imported++;
}
console.log(`Fetched ${rows.length} events from Supabase, imported ${imported} new.`);
await pool.end();
