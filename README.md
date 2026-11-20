# Dev Events

React + Vite frontend (`src/`) with a Node/TypeScript API (`server/`) on Postgres.

## Run locally

Requires Node 20.12+ and a running Postgres (e.g. `brew services start postgresql@14`).

```bash
npm install
npm run db:setup     # creates server/.env, the dev_events database, tables, sample events
npm run dev          # API on :3001 + frontend on :8080 (Vite proxies /api to the API)
```

Open http://localhost:8080. The admin page is `/admin`; its password is `ADMIN_PASSWORD` in `server/.env` (default `admin123`).

Optional: `npm run db:import-supabase` copies the events from the old hosted Supabase project (using the keys in the root `.env`).

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | API (`tsx watch`) and frontend together |
| `npm run dev:api` / `npm run dev:web` | Just one of them |
| `npm run db:setup` | Create `.env` + database if missing, apply migrations, seed if empty |
| `npm run db:migrate` | Apply new files in `server/db/migrations/` |
| `npm run db:seed` / `npm run db:reset` | Insert sample events / drop and rebuild the database |
| `npm run build && npm start` | Production: one process serves `dist/` and `/api` on `PORT` |
| `npm run typecheck:server` | Type-check the backend |

## Configuration (`server/.env`)

See `server/.env.example`. Scraping (admin "Scrape", saved-source auto-scrape, fee backfill) needs `FIRECRAWL_API_KEY` and `AI_API_KEY` (any OpenAI-compatible endpoint with tool calls, set via `AI_BASE_URL` / `AI_MODEL`). Without them those endpoints return 503 and everything else works.

## API

All routes are under `/api`. User routes take `Authorization: Bearer <token>` from sign-in; admin routes take the token from `POST /admin/session`.

| Method & path | Auth | |
| --- | --- | --- |
| `GET /health` | – | DB check |
| `POST /auth/signup` · `POST /auth/signin` | – | `{ email, password[, username] }` → `{ token, user }` |
| `GET /me` · `PATCH /me` | user | Current user / change `username` |
| `GET /events[?ids=a,b]` · `GET /events/:id` | – | Events (camelCase, same shape as `DevEvent`) |
| `POST /events` · `PATCH /events/:id` · `DELETE /events/:id` | admin | Manage events (409 on title+date duplicate) |
| `POST /events/import` | admin | Bulk insert, skips past events and duplicates |
| `GET /favorites` · `PUT/DELETE /favorites/:eventId` | user | Favorites |
| `POST /admin/session` | – | `{ password }` → admin token (12h) |
| `GET/POST /sources` · `DELETE /sources/:id` | admin | Saved scrape sources |
| `POST /admin/scrape` | admin | `{ url, sourceId? }` → extracted events (not saved) |
| `POST /admin/auto-scrape` · `POST /admin/backfill-fees` | admin | Batch jobs |

## Layout

```
server/
  src/index.ts          entry: HTTP server, static dist/, auto-scrape timer
  src/app.ts            routes mounted under /api
  src/routes/           auth, events, favorites, admin + sources
  src/events.ts         event validation and queries
  src/scraping/         Firecrawl + AI extraction + geocoding, batch jobs
  db/migrations/        plain SQL, applied in order by scripts/db.ts
src/lib/api.ts          frontend fetch wrapper + token storage
```

`supabase/` holds the previous hosted setup (edge functions, migrations) for reference; the app no longer uses it.
