CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;

ALTER TABLE public.company_installments
  ADD COLUMN IF NOT EXISTS invoice_no integer;

DO $$
DECLARE r RECORD; i integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.company_installments WHERE invoice_no IS NULL ORDER BY COALESCE(payment_date, created_at), created_at, id LOOP
    i := i + 1;
    UPDATE public.company_installments SET invoice_no = i WHERE id = r.id;
  END LOOP;
  PERFORM setval('public.invoice_number_seq', GREATEST(i, 1), i > 0);
END $$;

ALTER TABLE public.company_installments
  ALTER COLUMN invoice_no SET DEFAULT nextval('public.invoice_number_seq');

ALTER TABLE public.company_installments
  ALTER COLUMN invoice_no SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS company_installments_invoice_no_key ON public.company_installments (invoice_no);

GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.invoice_number_seq TO service_role;