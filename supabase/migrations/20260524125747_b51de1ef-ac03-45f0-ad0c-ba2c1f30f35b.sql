
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  has_creds boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services read" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services insert" ON public.services FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "services update" ON public.services FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "services delete" ON public.services FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER services_set_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.services (key, label, tags, has_creds, sort_order) VALUES
  ('email_account','Email Account', ARRAY['Credentials'], true, 10),
  ('bd_formation','BD Formation', ARRAY['Bangladesh'], false, 20),
  ('usa_subsidiary','USA Subsidiary', ARRAY['International'], false, 30),
  ('uk_subsidiary','UK Subsidiary', ARRAY['International'], false, 40),
  ('dhl_send','DHL Send', ARRAY['Logistics'], false, 50),
  ('sbc_clearance','SBC Clearance', ARRAY['Portal'], true, 60),
  ('misa_license','MISA License', ARRAY['Portal'], true, 70),
  ('cr_comm_reg','CR (Comm. Reg)', ARRAY['KSA'], false, 80),
  ('qiwa','QIWA', ARRAY['KSA'], false, 90),
  ('muqeem','MUQEEM', ARRAY['KSA'], true, 100),
  ('gosi','GOSI', ARRAY['KSA'], false, 110),
  ('zatca','ZATCA', ARRAY['KSA'], true, 120),
  ('spl','SPL', ARRAY['KSA'], true, 130),
  ('chamber','Chamber', ARRAY['KSA'], true, 140),
  ('kafala','Kafala', ARRAY['KSA'], false, 150),
  ('cr_extract','CR Extract', ARRAY['KSA'], false, 160),
  ('bank_account','Bank Account', ARRAY['Banking'], false, 170);
