
-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL DEFAULT '09:00',
  location TEXT NOT NULL DEFAULT 'Online',
  type TEXT NOT NULL DEFAULT 'meetup' CHECK (type IN ('conference', 'meetup', 'workshop', 'hackathon')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scrape sources table
CREATE TABLE public.scrape_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  last_scraped TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Public read access for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT TO anon, authenticated USING (true);

-- Public read/write for scrape_sources (admin-only in practice via password)
ALTER TABLE public.scrape_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sources" ON public.scrape_sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can manage sources" ON public.scrape_sources FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can manage events" ON public.events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
