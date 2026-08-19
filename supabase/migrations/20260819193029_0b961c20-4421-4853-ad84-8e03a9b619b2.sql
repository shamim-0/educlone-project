-- Expand creator_role to include sub_admin
ALTER TABLE public.todo_tasks DROP CONSTRAINT IF EXISTS todo_tasks_creator_role_check;
ALTER TABLE public.todo_tasks ADD CONSTRAINT todo_tasks_creator_role_check CHECK (creator_role IN ('admin','sub_admin','editor'));

-- Drop old restrictive todo_tasks policies
DROP POLICY IF EXISTS "Admins manage all todo_tasks" ON public.todo_tasks;
DROP POLICY IF EXISTS "Editors view assigned todo_tasks" ON public.todo_tasks;
DROP POLICY IF EXISTS "Editors insert own todo_tasks" ON public.todo_tasks;
DROP POLICY IF EXISTS "Editors update assigned todo_tasks" ON public.todo_tasks;
DROP POLICY IF EXISTS "Editors delete own todo_tasks" ON public.todo_tasks;

-- Unified full-access policy for admin, sub_admin, editor
CREATE POLICY "Admin sub_admin editor manage todo_tasks"
ON public.todo_tasks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin') OR public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin') OR public.has_role(auth.uid(), 'editor'));

-- Update trigger to allow full updates for admin, sub_admin, editor
CREATE OR REPLACE FUNCTION public.enforce_todo_task_editor_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin') OR public.has_role(auth.uid(), 'editor') THEN
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop old restrictive todo_task_services policies
DROP POLICY IF EXISTS "Admins manage all todo_task_services" ON public.todo_task_services;
DROP POLICY IF EXISTS "Editors view services of assigned tasks" ON public.todo_task_services;
DROP POLICY IF EXISTS "Editors insert services on own tasks" ON public.todo_task_services;
DROP POLICY IF EXISTS "Editors delete services on own tasks" ON public.todo_task_services;

-- Unified full-access policy for todo_task_services
CREATE POLICY "Admin sub_admin editor manage todo_task_services"
ON public.todo_task_services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin') OR public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sub_admin') OR public.has_role(auth.uid(), 'editor'));
