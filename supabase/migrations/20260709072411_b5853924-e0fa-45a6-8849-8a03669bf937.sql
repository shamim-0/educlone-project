
CREATE TABLE public.user_service_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_service_assignments TO authenticated;
GRANT ALL ON public.user_service_assignments TO service_role;

ALTER TABLE public.user_service_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all assignments"
  ON public.user_service_assignments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their own assignments"
  ON public.user_service_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
