CREATE TABLE public.company_shareholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shareholder_type TEXT NOT NULL DEFAULT 'owner',
  name TEXT NOT NULL,
  arabic_name TEXT,
  share_percent NUMERIC,
  phone TEXT,
  email TEXT,
  birthdate DATE,
  passport TEXT,
  nid TEXT,
  iqama TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_shareholders_company_id ON public.company_shareholders(company_id);
ALTER TABLE public.company_shareholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shareholders read" ON public.company_shareholders FOR SELECT TO authenticated USING (true);
CREATE POLICY "shareholders insert" ON public.company_shareholders FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
CREATE POLICY "shareholders update" ON public.company_shareholders FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
CREATE POLICY "shareholders delete" ON public.company_shareholders FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));