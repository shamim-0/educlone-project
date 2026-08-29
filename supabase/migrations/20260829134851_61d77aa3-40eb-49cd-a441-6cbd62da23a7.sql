ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS company_code text;

UPDATE public.companies
SET company_code = upper(replace((regexp_match(name, '^\s*(ISBI[A-Z]*\s*[0-9]+)'))[1], ' ', ''))
WHERE company_code IS NULL
  AND name ~* '^\s*ISBI[A-Z]*\s*[0-9]+';

UPDATE public.companies
SET company_code = upper(replace(tracking_id, ' ', ''))
WHERE company_code IS NULL AND tracking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS companies_company_code_key
  ON public.companies (company_code) WHERE company_code IS NOT NULL;

UPDATE public.companies
SET tracking_id = company_code || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
WHERE company_code IS NOT NULL;