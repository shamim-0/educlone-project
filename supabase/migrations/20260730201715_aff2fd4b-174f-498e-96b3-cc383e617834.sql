ALTER TABLE public.cr_activities ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE public.company_managers ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE public.company_shareholders ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE public.company_extra_deals ADD COLUMN IF NOT EXISTS updated_by text;