ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS continent text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE INDEX IF NOT EXISTS idx_events_continent ON public.events (continent);
CREATE INDEX IF NOT EXISTS idx_events_country ON public.events (country);
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events (city);