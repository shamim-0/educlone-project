DROP POLICY IF EXISTS "services insert" ON public.services;
DROP POLICY IF EXISTS "services update" ON public.services;
CREATE POLICY "services insert" ON public.services FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin'));
CREATE POLICY "services update" ON public.services FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin'));