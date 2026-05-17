-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Tracking table
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_documents_company_id ON public.company_documents(company_id);
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs read" ON public.company_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs insert" ON public.company_documents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
CREATE POLICY "docs delete" ON public.company_documents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Storage RLS policies for the bucket
CREATE POLICY "company-documents read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-documents');
CREATE POLICY "company-documents insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)));
CREATE POLICY "company-documents delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)));