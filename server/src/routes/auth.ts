import { Hono } from "hono";
import { z } from "zod";
import { query } from "../db.ts";
import { hashPassword, requireUser, signUserToken, verifyPassword, type AuthVars } from "../auth.ts";
import { HttpError, isUniqueViolation, parseBody } from "../http.ts";

const username = z
  .string()
  .trim()
  .min(3, "must be at least 3 characters")
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/, "letters, numbers, underscore and hyphen only");
const email = z.string().trim().toLowerCase().email();

const signupSchema = z.object({ email, password: z.string().min(6).max(200), username });
const signinSchema = z.object({ email, password: z.string().min(1) });

type UserRow = { id: string; email: string; username: string; password_hash?: string };
const publicUser = (u: UserRow) => ({ id: u.id, email: u.email, username: u.username });

export const authRoutes = new Hono<{ Variables: AuthVars }>()
  .post("/auth/signup", async (c) => {
    const body = await parseBody(c, signupSchema);
    try {
      const { rows } = await query<UserRow>(
        "INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING id, email, username",
        [body.email, await hashPassword(body.password), body.username],
      );
      return c.json({ token: await signUserToken(rows[0].id), user: publicUser(rows[0]) }, 201);
    } catch (e) {
      if (isUniqueViolation(e)) {
        const field = String((e as { constraint?: string }).constraint).includes("email") ? "Email" : "Username";
        throw new HttpError(409, `${field} is already taken.`);
      }
      throw e;
    }
  })

  .post("/auth/signin", async (c) => {
    const body = await parseBody(c, signinSchema);
    const { rows } = await query<UserRow>(
      "SELECT id, email, username, password_hash FROM users WHERE lower(email) = $1",
      [body.email],
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(body.password, user.password_hash!))) {
      throw new HttpError(401, "Invalid email or password.");
    }
    return c.json({ token: await signUserToken(user.id), user: publicUser(user) });
  })

  .get("/me", requireUser, async (c) => {
    const { rows } = await query<UserRow>("SELECT id, email, username FROM users WHERE id = $1", [c.var.userId]);
    if (!rows[0]) throw new HttpError(401, "Account no longer exists");
    return c.json({ user: publicUser(rows[0]) });
  })

  .patch("/me", requireUser, async (c) => {
    const body = await parseBody(c, z.object({ username }));
    try {
      const { rows } = await query<UserRow>(
        "UPDATE users SET username = $2, updated_at = now() WHERE id = $1 RETURNING id, email, username",
        [c.var.userId, body.username],
      );
      if (!rows[0]) throw new HttpError(401, "Account no longer exists");
      return c.json({ user: publicUser(rows[0]) });
    } catch (e) {
      if (isUniqueViolation(e)) throw new HttpError(409, "Username already taken.");
      throw e;
    }
  });
