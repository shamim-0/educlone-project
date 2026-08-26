ALTER TABLE public.company_steps ADD COLUMN IF NOT EXISTS status_changed_at timestamptz NOT NULL DEFAULT now();

UPDATE public.company_steps SET status_changed_at = updated_at WHERE updated_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_status_changed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.status_changed_at = now();
    ELSE
      NEW.status_changed_at = OLD.status_changed_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_steps_status_changed_at ON public.company_steps;
CREATE TRIGGER trg_company_steps_status_changed_at
BEFORE UPDATE ON public.company_steps
FOR EACH ROW EXECUTE FUNCTION public.set_status_changed_at();