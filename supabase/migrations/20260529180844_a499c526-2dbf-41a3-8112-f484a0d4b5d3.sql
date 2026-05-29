
-- 1. clusters table
CREATE TABLE public.clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  cover_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clusters TO authenticated;
GRANT ALL ON public.clusters TO service_role;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view clusters" ON public.clusters
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage clusters" ON public.clusters
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER set_clusters_updated_at
  BEFORE UPDATE ON public.clusters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. seed from existing text values (also import existing cover URLs)
INSERT INTO public.clusters (name, cover_url)
SELECT s.cluster, MAX(cc.cover_url)
FROM (
  SELECT cluster FROM public.programas WHERE cluster IS NOT NULL AND cluster <> ''
  UNION SELECT cluster FROM public.temas_momentos WHERE cluster IS NOT NULL AND cluster <> ''
  UNION SELECT cluster FROM public.badges WHERE cluster IS NOT NULL AND cluster <> ''
) s
LEFT JOIN public.cluster_covers cc ON cc.cluster_name = s.cluster
GROUP BY s.cluster
ON CONFLICT (name) DO NOTHING;

-- 3. programas.cluster_id
ALTER TABLE public.programas
  ADD COLUMN cluster_id uuid REFERENCES public.clusters(id) ON DELETE SET NULL;
UPDATE public.programas p SET cluster_id = c.id
  FROM public.clusters c WHERE c.name = p.cluster;

-- 4. temas_momentos.cluster_id
ALTER TABLE public.temas_momentos
  ADD COLUMN cluster_id uuid REFERENCES public.clusters(id) ON DELETE CASCADE;
UPDATE public.temas_momentos t SET cluster_id = c.id
  FROM public.clusters c WHERE c.name = t.cluster;

-- 5. recursos.cluster_id (inferred from program)
ALTER TABLE public.recursos
  ADD COLUMN cluster_id uuid REFERENCES public.clusters(id) ON DELETE SET NULL;
UPDATE public.recursos r SET cluster_id = p.cluster_id
  FROM public.programas p WHERE p.id = r.program_id AND p.cluster_id IS NOT NULL;

-- 6. badges: replace text cluster with cluster_id
ALTER TABLE public.badges
  ADD COLUMN cluster_id uuid REFERENCES public.clusters(id) ON DELETE CASCADE;
UPDATE public.badges b SET cluster_id = c.id
  FROM public.clusters c WHERE c.name = b.cluster;
ALTER TABLE public.badges ALTER COLUMN cluster_id SET NOT NULL;
ALTER TABLE public.badges DROP COLUMN cluster;

-- 7. badges validity columns
ALTER TABLE public.badges
  ADD COLUMN validity_type text NOT NULL DEFAULT 'forever'
    CHECK (validity_type IN ('forever','relative_years','fixed_date')),
  ADD COLUMN validity_years int,
  ADD COLUMN validity_fixed_date date;

-- 8. user_badges.expires_at
ALTER TABLE public.user_badges ADD COLUMN expires_at timestamptz;

-- 9. expiry trigger
CREATE OR REPLACE FUNCTION public.compute_user_badge_expiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record;
BEGIN
  IF NEW.expires_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT validity_type, validity_years, validity_fixed_date
    INTO b FROM public.badges WHERE id = NEW.badge_id;
  IF b.validity_type = 'relative_years' AND b.validity_years IS NOT NULL THEN
    NEW.expires_at := (coalesce(NEW.granted_at, now()) + make_interval(years => b.validity_years));
  ELSIF b.validity_type = 'fixed_date' AND b.validity_fixed_date IS NOT NULL THEN
    NEW.expires_at := (b.validity_fixed_date::timestamptz);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compute_user_badge_expiry_trg ON public.user_badges;
CREATE TRIGGER compute_user_badge_expiry_trg
BEFORE INSERT ON public.user_badges
FOR EACH ROW EXECUTE FUNCTION public.compute_user_badge_expiry();
