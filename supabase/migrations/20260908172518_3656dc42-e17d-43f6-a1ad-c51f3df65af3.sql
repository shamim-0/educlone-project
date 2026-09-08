ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office_access boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_office_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.office_access);
$$;

CREATE TABLE public.office_expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_expense_categories TO authenticated;
GRANT ALL ON public.office_expense_categories TO service_role;
ALTER TABLE public.office_expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office cat select" ON public.office_expense_categories FOR SELECT TO authenticated USING (public.has_office_access(auth.uid()));
CREATE POLICY "office cat insert" ON public.office_expense_categories FOR INSERT TO authenticated WITH CHECK (public.has_office_access(auth.uid()));
CREATE POLICY "office cat update" ON public.office_expense_categories FOR UPDATE TO authenticated USING (public.has_office_access(auth.uid())) WITH CHECK (public.has_office_access(auth.uid()));
CREATE POLICY "office cat delete" ON public.office_expense_categories FOR DELETE TO authenticated USING (public.has_office_access(auth.uid()));
CREATE TRIGGER trg_office_cat_updated_at BEFORE UPDATE ON public.office_expense_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.office_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.office_expense_categories(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  purpose text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL DEFAULT 'cash',
  note text,
  created_by uuid DEFAULT auth.uid(),
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_expenses TO authenticated;
GRANT ALL ON public.office_expenses TO service_role;
ALTER TABLE public.office_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "office exp select" ON public.office_expenses FOR SELECT TO authenticated USING (public.has_office_access(auth.uid()));
CREATE POLICY "office exp insert" ON public.office_expenses FOR INSERT TO authenticated WITH CHECK (public.has_office_access(auth.uid()));
CREATE POLICY "office exp update" ON public.office_expenses FOR UPDATE TO authenticated USING (public.has_office_access(auth.uid())) WITH CHECK (public.has_office_access(auth.uid()));
CREATE POLICY "office exp delete" ON public.office_expenses FOR DELETE TO authenticated USING (public.has_office_access(auth.uid()));
CREATE TRIGGER trg_office_expenses_updated_at BEFORE UPDATE ON public.office_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  designation text,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  monthly_salary numeric NOT NULL DEFAULT 0,
  phone text,
  active boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid DEFAULT auth.uid(),
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees select" ON public.employees FOR SELECT TO authenticated USING (public.has_office_access(auth.uid()));
CREATE POLICY "employees insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (public.has_office_access(auth.uid()));
CREATE POLICY "employees update" ON public.employees FOR UPDATE TO authenticated USING (public.has_office_access(auth.uid())) WITH CHECK (public.has_office_access(auth.uid()));
CREATE POLICY "employees delete" ON public.employees FOR DELETE TO authenticated USING (public.has_office_access(auth.uid()));
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  salary_month text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_date timestamptz,
  payment_method text NOT NULL DEFAULT 'cash',
  note text,
  created_by uuid DEFAULT auth.uid(),
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, salary_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_payments TO authenticated;
GRANT ALL ON public.salary_payments TO service_role;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary select" ON public.salary_payments FOR SELECT TO authenticated USING (public.has_office_access(auth.uid()));
CREATE POLICY "salary insert" ON public.salary_payments FOR INSERT TO authenticated WITH CHECK (public.has_office_access(auth.uid()));
CREATE POLICY "salary update" ON public.salary_payments FOR UPDATE TO authenticated USING (public.has_office_access(auth.uid())) WITH CHECK (public.has_office_access(auth.uid()));
CREATE POLICY "salary delete" ON public.salary_payments FOR DELETE TO authenticated USING (public.has_office_access(auth.uid()));
CREATE TRIGGER trg_salary_payments_updated_at BEFORE UPDATE ON public.salary_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();