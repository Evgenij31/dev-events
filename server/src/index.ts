import fs from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "./config.ts";
import { pool } from "./db.ts";
import { createApp } from "./app.ts";
import { autoScrapeAllSources } from "./scraping/jobs.ts";

const app = createApp();

// After `npm run build`, serve the built frontend from the same process
// (SPA fallback to index.html). In dev, Vite serves the frontend and proxies /api.
const distDir = path.resolve(config.serverRoot, "../dist");
if (fs.existsSync(path.join(distDir, "index.html"))) {
  const root = path.relative(process.cwd(), distDir);
  app.use("/*", serveStatic({ root }));
  app.get("*", serveStatic({ root, path: "index.html" }));
}

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}/api`);
});

if (config.autoScrapeIntervalHours > 0) {
  const ms = config.autoScrapeIntervalHours * 60 * 60 * 1000;
  console.log(`Auto-scrape every ${config.autoScrapeIntervalHours}h`);
  setInterval(() => autoScrapeAllSources().catch((e) => console.error("[auto-scrape]", e.message)), ms).unref();
}

const shutdown = () => {
  server.close();
  pool.end().finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
