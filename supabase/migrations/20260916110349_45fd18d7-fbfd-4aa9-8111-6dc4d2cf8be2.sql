ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'tga';
ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'after_licence';

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS mother_company_issued_date date,
  ADD COLUMN IF NOT EXISTS mother_company_expire_date date,
  ADD COLUMN IF NOT EXISTS company_issue_date date,
  ADD COLUMN IF NOT EXISTS company_expire_date date,
  ADD COLUMN IF NOT EXISTS misa_issued_date date,
  ADD COLUMN IF NOT EXISTS misa_expire_date date;