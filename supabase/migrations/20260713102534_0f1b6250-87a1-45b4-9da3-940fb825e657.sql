ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS client_name TEXT;
UPDATE public.companies SET client_name = name WHERE client_name IS NULL;