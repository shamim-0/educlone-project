ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tracking_id text;

UPDATE public.companies
SET tracking_id = upper((regexp_match(name, '^\s*(ISBI[A-Z]*\s*[0-9]+)'))[1])
WHERE tracking_id IS NULL
  AND name ~* '^\s*ISBI[A-Z]*\s*[0-9]+';

UPDATE public.companies
SET tracking_id = replace(tracking_id, ' ', '')
WHERE tracking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS companies_tracking_id_key ON public.companies (tracking_id) WHERE tracking_id IS NOT NULL;