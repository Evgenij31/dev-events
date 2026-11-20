import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load server/.env if present (Node >= 20.12). Real env vars take precedence.
try {
  process.loadEnvFile(path.join(serverRoot, ".env"));
} catch {
  // no .env file — rely on the process environment
}

const env = process.env;
const isProduction = env.NODE_ENV === "production";

function required(name: string, devDefault: string): string {
  const value = env[name];
  if (value) return value;
  if (isProduction) throw new Error(`Missing required env var ${name}`);
  console.warn(`[config] ${name} not set — using an insecure development default.`);
  return devDefault;
}

export const config = {
  isProduction,
  serverRoot,
  // API_PORT, not PORT: dev tooling often sets PORT for the frontend server.
  // In production (single process serving dist/ too) PORT is honoured.
  port: Number(env.API_PORT) || (isProduction && Number(env.PORT)) || 3001,
  databaseUrl: env.DATABASE_URL || "postgres://localhost:5432/dev_events",
  jwtSecret: required("JWT_SECRET", "dev-only-jwt-secret-change-me"),
  adminPassword: required("ADMIN_PASSWORD", "admin123"),
  userTokenTtl: "7d",
  adminTokenTtl: "12h",

  // Scraping pipeline (optional — admin scrape endpoints return 503 without them)
  firecrawlApiKey: env.FIRECRAWL_API_KEY || "",
  aiApiKey: env.AI_API_KEY || env.LOVABLE_API_KEY || "",
  aiBaseUrl: env.AI_BASE_URL || "https://ai.gateway.lovable.dev/v1",
  aiModel: env.AI_MODEL || "google/gemini-3-flash-preview",

  // 0 disables the in-process scheduler. 84 ≈ twice a week (matches the old pg_cron job).
  autoScrapeIntervalHours: Number(env.AUTO_SCRAPE_INTERVAL_HOURS) || 0,
};
