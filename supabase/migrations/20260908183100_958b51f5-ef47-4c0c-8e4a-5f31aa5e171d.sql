CREATE OR REPLACE FUNCTION public.generate_company_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pfx text;
  maxn int;
  bname text;
BEGIN
  -- Always derive the branch prefix from the selected branch.
  SELECT name INTO bname FROM public.branches WHERE id = NEW.branch_id;
  bname := lower(coalesce(bname, ''));
  pfx := CASE
    WHEN bname LIKE '%dammam%' THEN 'ISBID'
    WHEN bname LIKE '%madina%' THEN 'ISBIM'
    WHEN bname LIKE '%jeddah%' THEN 'ISBIJ'
    ELSE 'ISBI'
  END;

  -- Global sequence across all prefixes (ISBI/ISBID/ISBIM/ISBIJ).
  SELECT COALESCE(MAX((substring(code FROM '^ISBI[A-Z]?([0-9]+)'))::int), 0) INTO maxn
  FROM (
    SELECT COALESCE(NULLIF(btrim(company_code), ''), name) AS code
    FROM public.companies
  ) t
  WHERE code ~* '^ISBI[A-Z]?[0-9]+';

  -- Authoritative: always set company_code from the branch, regardless of client value.
  NEW.company_code := pfx || lpad((maxn + 1)::text, 5, '0');

  -- Always keep tracking_id in sync with the authoritative company_code.
  NEW.tracking_id := NEW.company_code || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_company_codes() FROM PUBLIC;