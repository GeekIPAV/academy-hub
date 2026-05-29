-- Performance indexes for new FKs
CREATE INDEX IF NOT EXISTS idx_programas_cluster_id ON public.programas(cluster_id);
CREATE INDEX IF NOT EXISTS idx_temas_momentos_cluster_id ON public.temas_momentos(cluster_id);
CREATE INDEX IF NOT EXISTS idx_recursos_cluster_id ON public.recursos(cluster_id);
CREATE INDEX IF NOT EXISTS idx_badges_cluster_id ON public.badges(cluster_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);

-- Tighten RLS on user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own badges or admin views all" ON public.user_badges;
DROP POLICY IF EXISTS "Admins assign badges" ON public.user_badges;
DROP POLICY IF EXISTS "Admins revoke badges" ON public.user_badges;
DROP POLICY IF EXISTS "Block direct updates" ON public.user_badges;

-- SELECT: own badges, or Admin, or Entidade role (for management)
CREATE POLICY "Read own badges or admin/entidade"
ON public.user_badges
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'Admin')
  OR public.has_role(auth.uid(), 'Entidade')
);

-- INSERT/UPDATE/DELETE: only Admin via authenticated role; all other writes
-- must go through service_role (server functions). UPDATE explicitly blocked.
CREATE POLICY "Admins assign badges"
ON public.user_badges
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins revoke badges"
ON public.user_badges
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'Admin'));

-- No UPDATE policy => UPDATE is blocked for authenticated users.
