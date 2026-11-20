-- Initial schema for the local backend.
-- Mirrors the Supabase tables (events, scrape_sources, favorites, profiles),
-- with auth users folded into a single `users` table owned by the API.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() on Postgres < 13

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  username      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE UNIQUE INDEX users_username_key ON users (lower(username));

CREATE TABLE events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  date           DATE NOT NULL,
  time           TEXT NOT NULL DEFAULT '09:00',
  location       TEXT NOT NULL DEFAULT 'Online',
  type           TEXT NOT NULL DEFAULT 'meetup'
                 CHECK (type IN ('conference', 'meetup', 'workshop', 'hackathon')),
  tags           TEXT[] NOT NULL DEFAULT '{}',
  url            TEXT,
  continent      TEXT,
  country        TEXT,
  city           TEXT,
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  fee_amount     NUMERIC,
  fee_amount_max NUMERIC,
  fee_currency   TEXT,
  fee_is_free    BOOLEAN,
  -- Set when the fee backfill has looked at this event, so events with no
  -- discoverable fee aren't re-scraped forever.
  fee_checked_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_date ON events (date);
CREATE INDEX idx_events_continent ON events (continent);
CREATE INDEX idx_events_country ON events (country);
CREATE INDEX idx_events_city ON events (city);
CREATE UNIQUE INDEX events_title_date_key ON events (lower(title), date);

CREATE TABLE scrape_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  last_scraped TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE favorites (
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);
