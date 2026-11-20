import { Hono } from "hono";
import { z } from "zod";
import { query } from "../db.ts";
import { checkAdminPassword, requireAdmin, signAdminToken } from "../auth.ts";
import { HttpError, parseBody } from "../http.ts";
import { assertScrapingConfigured, extractEvents, scrapeMarkdown } from "../scraping/pipeline.ts";
import { autoScrapeAllSources, backfillEventFees } from "../scraping/jobs.ts";

const mapSource = (r: any) => ({ id: r.id, name: r.name, url: r.url, lastScraped: r.last_scraped });

export const adminRoutes = new Hono()
  .post("/admin/session", async (c) => {
    const { password } = await parseBody(c, z.object({ password: z.string() }));
    if (!checkAdminPassword(password)) throw new HttpError(401, "Wrong password.");
    return c.json({ token: await signAdminToken() });
  })

  // Scrape sources
  .get("/sources", requireAdmin, async (c) => {
    const { rows } = await query("SELECT * FROM scrape_sources ORDER BY created_at DESC");
    return c.json(rows.map(mapSource));
  })

  .post("/sources", requireAdmin, async (c) => {
    const body = await parseBody(
      c,
      z.object({ name: z.string().trim().min(1).max(200), url: z.string().trim().min(1).max(2000) }),
    );
    const { rows } = await query("INSERT INTO scrape_sources (name, url) VALUES ($1, $2) RETURNING *", [
      body.name,
      body.url,
    ]);
    return c.json(mapSource(rows[0]), 201);
  })

  .delete("/sources/:id", requireAdmin, async (c) => {
    const id = z.string().uuid().safeParse(c.req.param("id"));
    if (!id.success) throw new HttpError(404, "Source not found");
    const { rowCount } = await query("DELETE FROM scrape_sources WHERE id = $1", [id.data]);
    if (!rowCount) throw new HttpError(404, "Source not found");
    return c.body(null, 204);
  })

  // Scraping
  .post("/admin/scrape", requireAdmin, async (c) => {
    const { url, sourceId } = await parseBody(
      c,
      z.object({ url: z.string().trim().min(1).max(2000), sourceId: z.string().uuid().optional() }),
    );
    assertScrapingConfigured();
    const events = await extractEvents(await scrapeMarkdown(url));
    if (sourceId) await query("UPDATE scrape_sources SET last_scraped = now() WHERE id = $1", [sourceId]);
    return c.json({ events });
  })

  .post("/admin/auto-scrape", requireAdmin, async (c) => c.json(await autoScrapeAllSources()))

  .post("/admin/backfill-fees", requireAdmin, async (c) => {
    const { limit } = await parseBody(c, z.object({ limit: z.number().int().min(1).max(50).default(20) }));
    return c.json(await backfillEventFees(limit));
  });
