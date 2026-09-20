CREATE TABLE public.company_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  license_type text NOT NULL,
  investor_type text NOT NULL,
  package_key text NOT NULL,
  template_key text NOT NULL,
  title text,
  field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  finalized_at timestamp with time zone,
  created_by uuid,
  created_by_name text,
  updated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_agreements TO authenticated;
GRANT ALL ON public.company_agreements TO service_role;

ALTER TABLE public.company_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view agreements"
ON public.company_agreements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can create agreements"
ON public.company_agreements FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Editors and admins can update drafts"
ON public.company_agreements FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR ((public.has_role(auth.uid(), 'sub_admin') OR public.has_role(auth.uid(), 'editor')) AND status = 'draft'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and sub admins can delete agreements"
ON public.company_agreements FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin'));

CREATE INDEX idx_company_agreements_company ON public.company_agreements(company_id);

CREATE TRIGGER trg_company_agreements_updated_at
BEFORE UPDATE ON public.company_agreements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();