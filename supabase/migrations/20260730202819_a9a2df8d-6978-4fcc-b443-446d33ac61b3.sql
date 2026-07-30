ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deal_updated_by text,
  ADD COLUMN IF NOT EXISTS deal_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS discount_updated_by text,
  ADD COLUMN IF NOT EXISTS discount_updated_at timestamptz;