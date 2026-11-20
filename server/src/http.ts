import type { Context } from "hono";
import { ZodError, type ZodTypeAny, type z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503,
    message: string,
  ) {
    super(message);
  }
}

export async function parseBody<S extends ZodTypeAny>(c: Context, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  return schema.parse(body);
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HttpError) {
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const where = issue?.path.join(".");
    return c.json({ error: where ? `${where}: ${issue.message}` : issue?.message || "Invalid input" }, 400);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
}

/** Postgres unique_violation */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
