import { Hono } from "hono";
import { z } from "zod";
import { requireAdmin } from "../auth.ts";
import { HttpError, parseBody } from "../http.ts";
import {
  deleteEvent,
  eventInputSchema,
  getEvent,
  importEvents,
  insertEvent,
  listEvents,
  updateEvent,
} from "../events.ts";

const uuid = z.string().uuid();
const idParam = (raw: string) => {
  const r = uuid.safeParse(raw);
  if (!r.success) throw new HttpError(404, "Event not found");
  return r.data;
};

export const eventRoutes = new Hono()
  // Public: list all events, or a subset with ?ids=a,b,c
  .get("/events", async (c) => {
    const idsParam = c.req.query("ids");
    if (idsParam === undefined) return c.json(await listEvents());
    const ids = idsParam.split(",").filter((id) => uuid.safeParse(id).success);
    return c.json(ids.length ? await listEvents(ids) : []);
  })

  .get("/events/:id", async (c) => {
    const event = await getEvent(idParam(c.req.param("id")));
    if (!event) throw new HttpError(404, "Event not found");
    return c.json(event);
  })

  // Admin-only writes
  .post("/events", requireAdmin, async (c) => {
    const event = await insertEvent(await parseBody(c, eventInputSchema));
    if (!event) throw new HttpError(409, "An event with this title and date already exists.");
    return c.json(event, 201);
  })

  .post("/events/import", requireAdmin, async (c) => {
    const { events } = await parseBody(c, z.object({ events: z.array(eventInputSchema).max(500) }));
    return c.json(await importEvents(events));
  })

  .patch("/events/:id", requireAdmin, async (c) => {
    const updates = await parseBody(c, eventInputSchema.partial());
    const event = await updateEvent(idParam(c.req.param("id")), updates);
    if (!event) throw new HttpError(404, "Event not found");
    return c.json(event);
  })

  .delete("/events/:id", requireAdmin, async (c) => {
    if (!(await deleteEvent(idParam(c.req.param("id"))))) throw new HttpError(404, "Event not found");
    return c.body(null, 204);
  });
