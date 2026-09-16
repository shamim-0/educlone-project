ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.has_office_branch_access(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = _user_id
          AND p.office_access
          AND (p.office_branch_id IS NULL OR p.office_branch_id = _branch_id)
      );
$$;

REVOKE EXECUTE ON FUNCTION public.has_office_branch_access(uuid, uuid) FROM anon;

-- office expenses: branch scoped writes
DROP POLICY IF EXISTS "office exp insert" ON public.office_expenses;
DROP POLICY IF EXISTS "office exp update" ON public.office_expenses;
DROP POLICY IF EXISTS "office exp delete" ON public.office_expenses;
CREATE POLICY "office exp insert" ON public.office_expenses FOR INSERT TO authenticated
  WITH CHECK (public.has_office_branch_access(auth.uid(), branch_id));
CREATE POLICY "office exp update" ON public.office_expenses FOR UPDATE TO authenticated
  USING (public.has_office_branch_access(auth.uid(), branch_id))
  WITH CHECK (public.has_office_branch_access(auth.uid(), branch_id));
CREATE POLICY "office exp delete" ON public.office_expenses FOR DELETE TO authenticated
  USING (public.has_office_branch_access(auth.uid(), branch_id));

-- employees: branch scoped writes
DROP POLICY IF EXISTS "employees insert" ON public.employees;
DROP POLICY IF EXISTS "employees update" ON public.employees;
DROP POLICY IF EXISTS "employees delete" ON public.employees;
CREATE POLICY "employees insert" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.has_office_branch_access(auth.uid(), branch_id));
CREATE POLICY "employees update" ON public.employees FOR UPDATE TO authenticated
  USING (public.has_office_branch_access(auth.uid(), branch_id))
  WITH CHECK (public.has_office_branch_access(auth.uid(), branch_id));
CREATE POLICY "employees delete" ON public.employees FOR DELETE TO authenticated
  USING (public.has_office_branch_access(auth.uid(), branch_id));

-- salary payments: only admins can pay
DROP POLICY IF EXISTS "salary insert" ON public.salary_payments;
DROP POLICY IF EXISTS "salary update" ON public.salary_payments;
DROP POLICY IF EXISTS "salary delete" ON public.salary_payments;
CREATE POLICY "salary insert" ON public.salary_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "salary update" ON public.salary_payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "salary delete" ON public.salary_payments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));