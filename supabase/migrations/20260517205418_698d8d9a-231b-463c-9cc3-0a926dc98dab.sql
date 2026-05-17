ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS emergency boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS take_action boolean NOT NULL DEFAULT false;