import { Hono } from "hono";
import { z } from "zod";
import { query } from "../db.ts";
import { requireUser, type AuthVars } from "../auth.ts";
import { HttpError } from "../http.ts";

const eventId = (raw: string) => {
  const r = z.string().uuid().safeParse(raw);
  if (!r.success) throw new HttpError(404, "Event not found");
  return r.data;
};

export const favoriteRoutes = new Hono<{ Variables: AuthVars }>()
  .use("/favorites/*", requireUser)
  .use("/favorites", requireUser)

  .get("/favorites", async (c) => {
    const { rows } = await query<{ event_id: string }>(
      "SELECT event_id FROM favorites WHERE user_id = $1 ORDER BY created_at",
      [c.var.userId],
    );
    return c.json({ eventIds: rows.map((r) => r.event_id) });
  })

  .put("/favorites/:eventId", async (c) => {
    const id = eventId(c.req.param("eventId"));
    const { rowCount } = await query(
      `INSERT INTO favorites (user_id, event_id)
       SELECT $1, id FROM events WHERE id = $2
       ON CONFLICT DO NOTHING`,
      [c.var.userId, id],
    );
    if (rowCount === 0) {
      const exists = await query("SELECT 1 FROM events WHERE id = $1", [id]);
      if (exists.rowCount === 0) throw new HttpError(404, "Event not found");
    }
    return c.body(null, 204);
  })

  .delete("/favorites/:eventId", async (c) => {
    await query("DELETE FROM favorites WHERE user_id = $1 AND event_id = $2", [
      c.var.userId,
      eventId(c.req.param("eventId")),
    ]);
    return c.body(null, 204);
  });
