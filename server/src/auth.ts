import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { createMiddleware } from "hono/factory";
import { config } from "./config.ts";
import { HttpError } from "./http.ts";

const secret = new TextEncoder().encode(config.jwtSecret);
const ISSUER = "dev-events-api";

type Role = "user" | "admin";

export type AuthVars = {
  userId: string;
};

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

async function signToken(role: Role, subject: string, ttl: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret);
}

export const signUserToken = (userId: string) => signToken("user", userId, config.userTokenTtl);
export const signAdminToken = () => signToken("admin", "admin", config.adminTokenTtl);

async function verifyToken(header: string | undefined, role: Role) {
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Not signed in");
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER });
    if (payload.role !== role || !payload.sub) throw new Error("wrong role");
    return payload.sub;
  } catch {
    throw new HttpError(401, role === "admin" ? "Admin session expired or invalid" : "Session expired or invalid");
  }
}

export function checkAdminPassword(password: string): boolean {
  const a = Buffer.from(password);
  const b = Buffer.from(config.adminPassword);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Requires `Authorization: Bearer <user token>`; sets c.var.userId. */
export const requireUser = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  c.set("userId", await verifyToken(c.req.header("Authorization"), "user"));
  await next();
});

/** Requires `Authorization: Bearer <admin token>`. */
export const requireAdmin = createMiddleware(async (c, next) => {
  await verifyToken(c.req.header("Authorization"), "admin");
  await next();
});
