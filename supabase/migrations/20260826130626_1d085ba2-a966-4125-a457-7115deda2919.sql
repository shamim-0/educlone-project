DROP POLICY IF EXISTS "company-documents insert" ON storage.objects;
DROP POLICY IF EXISTS "company-documents delete" ON storage.objects;
DROP POLICY IF EXISTS "company-documents update" ON storage.objects;

CREATE POLICY "company-documents insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sub_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)));

CREATE POLICY "company-documents update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sub_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)))
WITH CHECK (bucket_id = 'company-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sub_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)));

CREATE POLICY "company-documents delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sub_admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)));