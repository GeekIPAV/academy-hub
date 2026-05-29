
-- Public bucket for cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public can read covers"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'covers');

CREATE POLICY "Admins can upload covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'covers' AND public.is_admin(auth.uid()));

-- Cover image for individual recursos
ALTER TABLE public.recursos ADD COLUMN IF NOT EXISTS cover_url text;

-- Cluster covers (clusters are stored as strings on programas.cluster / temas_momentos.cluster)
CREATE TABLE IF NOT EXISTS public.cluster_covers (
  cluster_name text PRIMARY KEY,
  cover_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.cluster_covers TO authenticated;
GRANT ALL ON public.cluster_covers TO service_role;

ALTER TABLE public.cluster_covers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cluster_covers"
ON public.cluster_covers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage cluster_covers"
ON public.cluster_covers FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
