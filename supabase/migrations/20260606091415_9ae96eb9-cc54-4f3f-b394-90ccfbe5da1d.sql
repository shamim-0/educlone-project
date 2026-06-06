
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'sub_admin' THEN 2 WHEN 'editor' THEN 3 WHEN 'viewer' THEN 4 END
  LIMIT 1
$function$;

DROP POLICY IF EXISTS "companies insert" ON public.companies;
DROP POLICY IF EXISTS "companies update" ON public.companies;
DROP POLICY IF EXISTS "branches insert" ON public.branches;
DROP POLICY IF EXISTS "branches update" ON public.branches;
DROP POLICY IF EXISTS "accounts insert" ON public.accounts;
DROP POLICY IF EXISTS "accounts update" ON public.accounts;
DROP POLICY IF EXISTS "steps insert" ON public.company_steps;
DROP POLICY IF EXISTS "steps update" ON public.company_steps;
DROP POLICY IF EXISTS "docs insert" ON public.company_documents;
DROP POLICY IF EXISTS "installments insert" ON public.company_installments;
DROP POLICY IF EXISTS "installments update" ON public.company_installments;
DROP POLICY IF EXISTS "managers insert" ON public.company_managers;
DROP POLICY IF EXISTS "managers update" ON public.company_managers;
DROP POLICY IF EXISTS "shareholders insert" ON public.company_shareholders;
DROP POLICY IF EXISTS "shareholders update" ON public.company_shareholders;
DROP POLICY IF EXISTS "cr_activities insert" ON public.cr_activities;
DROP POLICY IF EXISTS "cr_activities update" ON public.cr_activities;
DROP POLICY IF EXISTS "pending insert" ON public.pending_tasks;
DROP POLICY IF EXISTS "pending update" ON public.pending_tasks;

CREATE POLICY "companies insert" ON public.companies FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "companies update" ON public.companies FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "branches insert" ON public.branches FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "branches update" ON public.branches FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "accounts insert" ON public.accounts FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "accounts update" ON public.accounts FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "steps insert" ON public.company_steps FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "steps update" ON public.company_steps FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "docs insert" ON public.company_documents FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "installments insert" ON public.company_installments FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "installments update" ON public.company_installments FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "managers insert" ON public.company_managers FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "managers update" ON public.company_managers FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "shareholders insert" ON public.company_shareholders FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "shareholders update" ON public.company_shareholders FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "cr_activities insert" ON public.cr_activities FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "cr_activities update" ON public.cr_activities FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "pending insert" ON public.pending_tasks FOR INSERT WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
CREATE POLICY "pending update" ON public.pending_tasks FOR UPDATE USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sub_admin') OR has_role(auth.uid(),'editor'));
