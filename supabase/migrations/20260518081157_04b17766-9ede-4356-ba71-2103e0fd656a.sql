
-- Add missing fields to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS vat text,
  ADD COLUMN IF NOT EXISTS total_deal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS account_note text,
  ADD COLUMN IF NOT EXISTS update_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS legacy_id integer;

CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_key ON public.companies(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS companies_legacy_id_key ON public.companies(legacy_id) WHERE legacy_id IS NOT NULL;

-- Add missing fields to company_steps
ALTER TABLE public.company_steps
  ADD COLUMN IF NOT EXISTS cred_user text,
  ADD COLUMN IF NOT EXISTS cred_pass text,
  ADD COLUMN IF NOT EXISTS cred_notes text,
  ADD COLUMN IF NOT EXISTS update_status_by text;

-- Add missing fields to company_managers
ALTER TABLE public.company_managers
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- New installments table
CREATE TABLE IF NOT EXISTS public.company_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "installments read" ON public.company_installments FOR SELECT TO authenticated USING (true);
CREATE POLICY "installments insert" ON public.company_installments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
CREATE POLICY "installments update" ON public.company_installments FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
CREATE POLICY "installments delete" ON public.company_installments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
