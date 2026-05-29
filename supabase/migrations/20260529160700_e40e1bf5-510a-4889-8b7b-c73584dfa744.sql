
CREATE TABLE public.resource_categories (
  key text PRIMARY KEY,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.resource_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_categories TO authenticated;
GRANT ALL ON public.resource_categories TO service_role;

ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view resource_categories"
  ON public.resource_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins insert resource_categories"
  ON public.resource_categories FOR INSERT
  TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins update resource_categories"
  ON public.resource_categories FOR UPDATE
  TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins delete resource_categories"
  ON public.resource_categories FOR DELETE
  TO authenticated USING (is_admin(auth.uid()));

ALTER TABLE public.recursos
  ADD COLUMN category_key text,
  ADD COLUMN objectives text;
