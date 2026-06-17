## Goal
Add a `fee` field to every event card. Display:
- "Free" if no cost
- The fee amount in the **viewer's local currency** (live-converted)
- "No data" if unknown

Also backfill fees for all existing events that have a URL.

## 1. Database (migration)
- Add to `public.events`:
  - `fee_amount numeric` (nullable) — original numeric value
  - `fee_currency text` (nullable) — ISO code, e.g. `USD`, `EUR`
  - `fee_is_free boolean` (nullable) — `true` = explicitly free, `null` = unknown
- `fee_amount` + `fee_currency` both null AND `fee_is_free` null ⇒ "No data".

## 2. Scraping (extract fee)
Update `supabase/functions/scrape-events/index.ts`:
- Extend the AI tool schema with `fee_is_free` (bool), `fee_amount` (number), `fee_currency` (ISO 4217 code).
- Prompt: "If the event is explicitly free, set fee_is_free=true. If a ticket/registration price is shown, return the lowest price as fee_amount + ISO currency code. If no fee info exists, omit all fee fields."
- Persist these fields wherever events are inserted (`auto-scrape-events` + admin/manual insert in `src/lib/events.ts`).

## 3. Backfill existing events (one-off)
New edge function `supabase/functions/backfill-event-fees/index.ts`:
- Select all events with a `url` and no fee data set.
- For each, Firecrawl-scrape the URL (markdown), then ask the AI gateway for `{ fee_is_free, fee_amount, fee_currency }`.
- Update the row. Skip on failure, log progress.
- Trigger manually from the **Admin page** via a new "Backfill fees" button (uses the existing admin password gate). Runs in batches to avoid timeouts.

## 4. Currency conversion (live, viewer-based)
- Detect viewer currency once per session:
  - Try `Intl.NumberFormat().resolvedOptions()` and a free IP lookup (e.g. `https://ipapi.co/json/` → `currency`). Fallback: `USD`.
  - Store in a React context (`CurrencyProvider`) + `localStorage`.
- Fetch FX rates from a free no-key API (`https://api.exchangerate.host/latest?base=USD`), cache in `localStorage` for 24 h.
- Helper `formatFee(amount, fromCurrency, toCurrency, rates)` → `Intl.NumberFormat(locale, { style: 'currency', currency })`.

## 5. UI (`src/components/EventCard.tsx`)
Add a small line above the Register/Join link:
```
🎟  Fee: Free          (when fee_is_free)
🎟  Fee: €185 (~$199)  (converted; original shown faintly in tooltip)
🎟  Fee: No data       (muted)
```
Use a `Ticket` icon from lucide-react and the existing terminal/neon styling.

## 6. Types
After migration, regenerated `src/integrations/supabase/types.ts` exposes the new columns; update `DevEvent` in `src/lib/events.ts` and `mapRow`.

## Open questions / assumptions
- I'll use **exchangerate.host** (no API key) for FX. If you'd rather use a specific provider, say so.
- Viewer-currency detection uses **ipapi.co** free tier (1k req/day, no key). I'll cache aggressively. Tell me if you want a different source or a manual currency selector instead.
- Backfill is triggered manually from Admin (safer than running automatically on every existing event since it consumes Firecrawl credits).
