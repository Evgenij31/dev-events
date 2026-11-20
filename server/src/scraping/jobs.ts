import { query } from "../db.ts";
import { importEvents } from "../events.ts";
import { assertScrapingConfigured, extractEvents, extractFee, scrapeMarkdown } from "./pipeline.ts";

/** Scrapes every saved source and imports new upcoming events. */
export async function autoScrapeAllSources() {
  assertScrapingConfigured();
  const { rows: sources } = await query<{ id: string; name: string; url: string }>(
    "SELECT id, name, url FROM scrape_sources ORDER BY created_at",
  );

  let imported = 0;
  let skipped = 0;
  const failed: string[] = [];
  for (const source of sources) {
    try {
      const events = await extractEvents(await scrapeMarkdown(source.url));
      const r = await importEvents(events);
      imported += r.imported;
      skipped += r.duplicates + r.past;
      await query("UPDATE scrape_sources SET last_scraped = now() WHERE id = $1", [source.id]);
    } catch (e) {
      console.error(`[auto-scrape] ${source.name} (${source.url}) failed:`, e);
      failed.push(source.name);
    }
  }
  console.log(`[auto-scrape] ${sources.length} sources: ${imported} imported, ${skipped} skipped, ${failed.length} failed`);
  return { sources: sources.length, imported, skipped, failed };
}

/** Fills in fee info for events that have a URL but were never checked. */
export async function backfillEventFees(limit: number) {
  assertScrapingConfigured();
  const { rows: events } = await query<{ id: string; url: string }>(
    `SELECT id, url FROM events
     WHERE url IS NOT NULL AND fee_checked_at IS NULL
       AND fee_amount IS NULL AND fee_is_free IS NULL
     ORDER BY date LIMIT $1`,
    [limit],
  );

  let updated = 0;
  let failed = 0;
  for (const ev of events) {
    try {
      const fee = await extractFee(await scrapeMarkdown(ev.url));
      const { rowCount } = await query(
        `UPDATE events SET
           fee_is_free    = COALESCE($2, fee_is_free),
           fee_amount     = COALESCE($3, fee_amount),
           fee_amount_max = COALESCE($4, fee_amount_max),
           fee_currency   = COALESCE($5, fee_currency),
           fee_checked_at = now()
         WHERE id = $1 AND ($2::boolean IS NOT NULL OR $3::numeric IS NOT NULL)`,
        [
          ev.id,
          typeof fee.fee_is_free === "boolean" ? fee.fee_is_free : null,
          typeof fee.fee_amount === "number" ? fee.fee_amount : null,
          typeof fee.fee_amount_max === "number" ? fee.fee_amount_max : null,
          typeof fee.fee_currency === "string" ? fee.fee_currency.toUpperCase() : null,
        ],
      );
      if (rowCount) updated++;
      else await query("UPDATE events SET fee_checked_at = now() WHERE id = $1", [ev.id]);
    } catch (e) {
      console.error(`[backfill-fees] ${ev.url} failed:`, e);
      failed++;
      // Mark as checked so a permanently broken URL doesn't block the queue.
      await query("UPDATE events SET fee_checked_at = now() WHERE id = $1", [ev.id]);
    }
  }
  return { processed: events.length, updated, failed, remaining: events.length === limit };
}
