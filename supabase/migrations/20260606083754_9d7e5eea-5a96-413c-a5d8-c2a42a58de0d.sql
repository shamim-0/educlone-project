ALTER TABLE public.services ADD COLUMN IF NOT EXISTS subtasks text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.company_steps ADD COLUMN IF NOT EXISTS subtasks_done text[] NOT NULL DEFAULT '{}';