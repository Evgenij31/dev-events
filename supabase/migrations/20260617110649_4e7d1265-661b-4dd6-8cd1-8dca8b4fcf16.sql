ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS fee_amount numeric,
  ADD COLUMN IF NOT EXISTS fee_currency text,
  ADD COLUMN IF NOT EXISTS fee_is_free boolean;