
CREATE TYPE public.company_type AS ENUM ('entrepreneur', 'trading', 'services');

ALTER TABLE public.companies
  ADD COLUMN type public.company_type NOT NULL DEFAULT 'trading',
  ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
