CREATE TABLE public.company_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  manager_type text NOT NULL DEFAULT 'manager',
  iqama text,
  birthdate date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_managers_company_id ON public.company_managers(company_id);
ALTER TABLE public.company_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read" ON public.company_managers FOR SELECT TO authenticated USING (true);
CREATE POLICY "managers insert" ON public.company_managers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'editor'::app_role));
CREATE POLICY "managers update" ON public.company_managers FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'editor'::app_role));
CREATE POLICY "managers delete" ON public.company_managers FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'editor'::app_role));