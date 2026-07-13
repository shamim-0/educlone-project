
-- todo_tasks table
CREATE TABLE public.todo_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL,
  created_by uuid NOT NULL,
  creator_role text NOT NULL CHECK (creator_role IN ('admin','editor')),
  deadline date,
  admin_note text,
  editor_note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_tasks TO authenticated;
GRANT ALL ON public.todo_tasks TO service_role;

ALTER TABLE public.todo_tasks ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage all todo_tasks"
ON public.todo_tasks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Editor: SELECT tasks assigned to them
CREATE POLICY "Editors view assigned todo_tasks"
ON public.todo_tasks FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

-- Editor: INSERT own tasks (assigned to self)
CREATE POLICY "Editors insert own todo_tasks"
ON public.todo_tasks FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND assigned_to = auth.uid()
  AND creator_role = 'editor'
  AND public.has_role(auth.uid(), 'editor')
);

-- Editor: UPDATE tasks assigned to them (trigger enforces field restrictions for admin-created)
CREATE POLICY "Editors update assigned todo_tasks"
ON public.todo_tasks FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Editor: DELETE only own editor-created tasks
CREATE POLICY "Editors delete own todo_tasks"
ON public.todo_tasks FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND creator_role = 'editor'
);

-- Trigger: prevent editors from modifying protected fields on admin tasks
CREATE OR REPLACE FUNCTION public.enforce_todo_task_editor_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Non-admin: if task was created by admin, restrict to status/editor_note only
  IF OLD.creator_role = 'admin' THEN
    IF NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.creator_role IS DISTINCT FROM OLD.creator_role
       OR NEW.deadline IS DISTINCT FROM OLD.deadline
       OR NEW.admin_note IS DISTINCT FROM OLD.admin_note THEN
      RAISE EXCEPTION 'Editors can only update status and editor_note on admin-assigned tasks';
    END IF;
  ELSE
    -- Editor-created: must remain owner
    IF NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.creator_role IS DISTINCT FROM OLD.creator_role
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      RAISE EXCEPTION 'Cannot change ownership fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_todo_task_editor_update
BEFORE UPDATE ON public.todo_tasks
FOR EACH ROW EXECUTE FUNCTION public.enforce_todo_task_editor_update();

CREATE TRIGGER trg_todo_tasks_updated_at
BEFORE UPDATE ON public.todo_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- todo_task_services table
CREATE TABLE public.todo_task_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.todo_tasks(id) ON DELETE CASCADE,
  service_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, service_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_task_services TO authenticated;
GRANT ALL ON public.todo_task_services TO service_role;

ALTER TABLE public.todo_task_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all todo_task_services"
ON public.todo_task_services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors view services of assigned tasks"
ON public.todo_task_services FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.todo_tasks t
  WHERE t.id = todo_task_services.task_id
    AND t.assigned_to = auth.uid()
));

CREATE POLICY "Editors insert services on own tasks"
ON public.todo_task_services FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.todo_tasks t
  WHERE t.id = todo_task_services.task_id
    AND t.created_by = auth.uid()
    AND t.creator_role = 'editor'
));

CREATE POLICY "Editors delete services on own tasks"
ON public.todo_task_services FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.todo_tasks t
  WHERE t.id = todo_task_services.task_id
    AND t.created_by = auth.uid()
    AND t.creator_role = 'editor'
));
