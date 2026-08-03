CREATE SEQUENCE IF NOT EXISTS public.expense_voucher_seq START 1;

CREATE TABLE public.company_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date timestamp with time zone,
  payment_method text NOT NULL DEFAULT 'cash',
  note text,
  voucher_no integer NOT NULL DEFAULT nextval('public.expense_voucher_seq') UNIQUE,
  created_by uuid,
  updated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_expenses TO authenticated;
GRANT ALL ON public.company_expenses TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.expense_voucher_seq TO authenticated, service_role;
ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses admin read" ON public.company_expenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "expenses admin insert" ON public.company_expenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "expenses admin update" ON public.company_expenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "expenses admin delete" ON public.company_expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_company_expenses_updated_at BEFORE UPDATE ON public.company_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.company_extra_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  note text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_extra_expenses TO authenticated;
GRANT ALL ON public.company_extra_expenses TO service_role;
ALTER TABLE public.company_extra_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extra expenses admin read" ON public.company_extra_expenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "extra expenses admin insert" ON public.company_extra_expenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "extra expenses admin update" ON public.company_extra_expenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "extra expenses admin delete" ON public.company_extra_expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_company_extra_expenses_updated_at BEFORE UPDATE ON public.company_extra_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();