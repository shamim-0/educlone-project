CREATE OR REPLACE FUNCTION public.generate_company_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pfx text;
  maxn int;
  bname text;
BEGIN
  IF NEW.company_code IS NULL OR btrim(NEW.company_code) = '' THEN
    SELECT name INTO bname FROM public.branches WHERE id = NEW.branch_id;
    bname := lower(coalesce(bname, ''));
    pfx := CASE
      WHEN bname LIKE '%dammam%' THEN 'ISBID'
      WHEN bname LIKE '%madina%' THEN 'ISBIM'
      WHEN bname LIKE '%jeddah%' THEN 'ISBIJ'
      ELSE 'ISBI'
    END;
    SELECT COALESCE(MAX((substring(code FROM '^ISBI[A-Z]?([0-9]+)'))::int), 0) INTO maxn
    FROM (
      SELECT COALESCE(NULLIF(btrim(company_code), ''), name) AS code
      FROM public.companies
    ) t
    WHERE code ~* '^ISBI[A-Z]?[0-9]+';
    NEW.company_code := pfx || lpad((maxn + 1)::text, 5, '0');
  END IF;
  IF NEW.tracking_id IS NULL OR btrim(NEW.tracking_id) = '' THEN
    NEW.tracking_id := NEW.company_code || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_generate_codes
BEFORE INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.generate_company_codes();