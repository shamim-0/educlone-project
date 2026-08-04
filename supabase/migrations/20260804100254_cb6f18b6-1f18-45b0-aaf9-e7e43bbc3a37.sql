ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expenses_access boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_expenses_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.expenses_access);
$$;

DROP POLICY IF EXISTS "Admins can view expenses" ON public.company_expenses;
DROP POLICY IF EXISTS "Admins can insert expenses" ON public.company_expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.company_expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.company_expenses;

CREATE POLICY "Expense access users can view expenses" ON public.company_expenses FOR SELECT TO authenticated USING (public.has_expenses_access(auth.uid()));
CREATE POLICY "Expense access users can insert expenses" ON public.company_expenses FOR INSERT TO authenticated WITH CHECK (public.has_expenses_access(auth.uid()));
CREATE POLICY "Expense access users can update expenses" ON public.company_expenses FOR UPDATE TO authenticated USING (public.has_expenses_access(auth.uid())) WITH CHECK (public.has_expenses_access(auth.uid()));
CREATE POLICY "Expense access users can delete expenses" ON public.company_expenses FOR DELETE TO authenticated USING (public.has_expenses_access(auth.uid()));

DROP POLICY IF EXISTS "Admins can view extra expenses" ON public.company_extra_expenses;
DROP POLICY IF EXISTS "Admins can insert extra expenses" ON public.company_extra_expenses;
DROP POLICY IF EXISTS "Admins can update extra expenses" ON public.company_extra_expenses;
DROP POLICY IF EXISTS "Admins can delete extra expenses" ON public.company_extra_expenses;

CREATE POLICY "Expense access users can view extra expenses" ON public.company_extra_expenses FOR SELECT TO authenticated USING (public.has_expenses_access(auth.uid()));
CREATE POLICY "Expense access users can insert extra expenses" ON public.company_extra_expenses FOR INSERT TO authenticated WITH CHECK (public.has_expenses_access(auth.uid()));
CREATE POLICY "Expense access users can update extra expenses" ON public.company_extra_expenses FOR UPDATE TO authenticated USING (public.has_expenses_access(auth.uid())) WITH CHECK (public.has_expenses_access(auth.uid()));
CREATE POLICY "Expense access users can delete extra expenses" ON public.company_extra_expenses FOR DELETE TO authenticated USING (public.has_expenses_access(auth.uid()));