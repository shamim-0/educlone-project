
CREATE TABLE IF NOT EXISTS public.cr_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cr_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cr_activities read" ON public.cr_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "cr_activities insert" ON public.cr_activities FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'editor'::app_role));
CREATE POLICY "cr_activities update" ON public.cr_activities FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'editor'::app_role));
CREATE POLICY "cr_activities delete" ON public.cr_activities FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'editor'::app_role));

CREATE INDEX IF NOT EXISTS idx_cr_activities_company ON public.cr_activities(company_id);
