import { Hono } from "hono";
import { logger } from "hono/logger";
import { query } from "./db.ts";
import { errorHandler } from "./http.ts";
import { authRoutes } from "./routes/auth.ts";
import { eventRoutes } from "./routes/events.ts";
import { favoriteRoutes } from "./routes/favorites.ts";
import { adminRoutes } from "./routes/admin.ts";

export function createApp({ log = true } = {}) {
  const app = new Hono();
  if (log) app.use("/api/*", logger());
  app.onError(errorHandler);

  app.get("/api/health", async (c) => {
    await query("SELECT 1");
    return c.json({ ok: true });
  });
  app.route("/api", authRoutes);
  app.route("/api", eventRoutes);
  app.route("/api", favoriteRoutes);
  app.route("/api", adminRoutes);
  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

  return app;
}
