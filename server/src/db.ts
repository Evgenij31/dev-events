import pg from "pg";
import { config } from "./config.ts";

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates (which would
// shift by the server's timezone), and NUMERIC as JS numbers.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export async function query<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}
