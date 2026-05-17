
-- Extend companies with profile fields
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS cr_number text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS note text;

-- Workflow steps per company
CREATE TABLE IF NOT EXISTS public.company_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  note text,
  username text,
  password text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, step_key)
);

ALTER TABLE public.company_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "steps read" ON public.company_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "steps insert" ON public.company_steps FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'editor'::app_role));
CREATE POLICY "steps update" ON public.company_steps FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'editor'::app_role));
CREATE POLICY "steps delete" ON public.company_steps FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_company_steps_company ON public.company_steps(company_id);
