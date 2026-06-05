-- Helper: check whether a user can access a given cluster
CREATE OR REPLACE FUNCTION public.user_can_access_cluster(_user_id uuid, _cluster_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _cluster_id IS NOT NULL
    AND (
      -- has an unexpired badge in this cluster
      EXISTS (
        SELECT 1
        FROM public.user_badges ub
        JOIN public.badges b ON b.id = ub.badge_id
        WHERE ub.user_id = _user_id
          AND b.cluster_id = _cluster_id
          AND (ub.expires_at IS NULL OR ub.expires_at > now())
      )
      OR
      -- enrolled in a cohort whose program is in this cluster
      EXISTS (
        SELECT 1
        FROM public.inscritos_programa ip
        JOIN public.entidades_programas ep ON ep.id = ip.cohort_id
        JOIN public.programas p ON p.id = ep.program_id
        WHERE ip.user_id = _user_id
          AND p.cluster_id = _cluster_id
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_cluster(uuid, uuid) TO authenticated;

-- Helper: can the user read a given recurso?
CREATE OR REPLACE FUNCTION public.user_can_access_recurso(_user_id uuid, _recurso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND (
      public.is_admin(_user_id)
      OR public.has_role(_user_id, 'Formador')
      OR EXISTS (
        SELECT 1 FROM public.recursos r
        WHERE r.id = _recurso_id AND r.cluster_id IS NOT NULL
          AND public.user_can_access_cluster(_user_id, r.cluster_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.tema_recursos tr
        JOIN public.temas_momentos tm ON tm.id = tr.tema_id
        WHERE tr.recurso_id = _recurso_id
          AND tm.cluster_id IS NOT NULL
          AND public.user_can_access_cluster(_user_id, tm.cluster_id)
      )
      OR -- uncategorized resources (no cluster, no tema) remain visible to any authenticated user (general library)
      (
        EXISTS (SELECT 1 FROM public.recursos r WHERE r.id = _recurso_id AND r.cluster_id IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM public.tema_recursos tr
          JOIN public.temas_momentos tm ON tm.id = tr.tema_id
          WHERE tr.recurso_id = _recurso_id AND tm.cluster_id IS NOT NULL
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_recurso(uuid, uuid) TO authenticated;

-- Tighten SELECT policy on public.recursos
DROP POLICY IF EXISTS "Formandos podem ler recursos" ON public.recursos;
CREATE POLICY "Utilizadores autorizados leem recursos"
  ON public.recursos
  FOR SELECT
  USING (public.user_can_access_recurso(auth.uid(), id));
