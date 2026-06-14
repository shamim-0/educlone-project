CREATE TABLE public.company_extra_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_extra_deals TO authenticated;
GRANT ALL ON public.company_extra_deals TO service_role;

ALTER TABLE public.company_extra_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view extra deals"
ON public.company_extra_deals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Writers can insert extra deals"
ON public.company_extra_deals FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sub_admin')
  OR public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Writers can update extra deals"
ON public.company_extra_deals FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sub_admin')
  OR public.has_role(auth.uid(), 'editor')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sub_admin')
  OR public.has_role(auth.uid(), 'editor')
);

CREATE POLICY "Admin can delete extra deals"
ON public.company_extra_deals FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sub_admin')
);

CREATE TRIGGER set_company_extra_deals_updated_at
BEFORE UPDATE ON public.company_extra_deals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_company_extra_deals_company ON public.company_extra_deals(company_id);