// Thin client for the backend API (server/). In dev, Vite proxies /api to it.

const USER_TOKEN_KEY = "auth_token";
const ADMIN_TOKEN_KEY = "admin_token";

function storageGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string | null) {
  try {
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch {
    // storage unavailable (private mode etc.) — session just won't persist
  }
}

export const tokens = {
  user: () => storageGet(localStorage, USER_TOKEN_KEY),
  setUser: (t: string | null) => storageSet(localStorage, USER_TOKEN_KEY, t),
  admin: () => storageGet(sessionStorage, ADMIN_TOKEN_KEY),
  setAdmin: (t: string | null) => storageSet(sessionStorage, ADMIN_TOKEN_KEY, t),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: "user" | "admin";
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = opts.auth === "admin" ? tokens.admin() : opts.auth === "user" ? tokens.user() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the API running?");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && opts.auth === "admin") tokens.setAdmin(null);
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}
