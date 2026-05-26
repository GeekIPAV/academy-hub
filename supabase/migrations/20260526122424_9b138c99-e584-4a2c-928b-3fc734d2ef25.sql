
CREATE TABLE public.resource_types (
  key text PRIMARY KEY,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view resource_types"
  ON public.resource_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert resource_types"
  ON public.resource_types FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins update resource_types"
  ON public.resource_types FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins delete resource_types"
  ON public.resource_types FOR DELETE TO authenticated USING (is_admin(auth.uid()));

INSERT INTO public.resource_types (key, label, color, sort_order) VALUES
  ('pdf', 'PDF', '#dc2626', 10),
  ('video', 'Vídeo', '#008DD5', 20)
ON CONFLICT (key) DO NOTHING;
