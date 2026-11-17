CREATE OR REPLACE FUNCTION public.has_centro_recursos_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role_name IN ('Utilizador', 'Entidade', 'Admin', 'Equipa IPAV', 'Teste')
    )
    OR EXISTS (
      SELECT 1 FROM public.utilizadores u
      WHERE u.id = _user_id
        AND u.role IN ('Utilizador', 'Entidade', 'Admin', 'Equipa IPAV', 'Teste')
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_centro_recursos_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_centro_recursos_access(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_can_access_tema(_user_id uuid, _tema_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL AND (
    public.is_equipa(_user_id)
    OR public.has_centro_recursos_access(_user_id)
    OR public.has_role(_user_id, 'Formador')
    OR EXISTS (
      SELECT 1 FROM public.temas_momentos t
      WHERE t.id = _tema_id
        AND (
          (t.cluster_id IS NOT NULL AND public.user_can_access_cluster(_user_id, t.cluster_id))
          OR EXISTS (
            SELECT 1
            FROM public.permissoes_roles pr
            JOIN public.user_roles ur ON ur.role_name = pr.role_name AND ur.user_id = _user_id
            WHERE pr.tipo = 'componente'
              AND pr.resource_id = '/recursos#cluster:' || regexp_replace(
                regexp_replace(
                  lower(translate(t.cluster,
                    'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñ',
                    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
                  '[^a-z0-9]+', '-', 'g'),
                '(^-|-$)', '', 'g')
          )
        )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_can_access_recurso(_user_id uuid, _recurso_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _user_id IS NOT NULL
    AND (
      public.is_admin(_user_id)
      OR public.has_centro_recursos_access(_user_id)
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
      OR (
        EXISTS (SELECT 1 FROM public.recursos r WHERE r.id = _recurso_id AND r.cluster_id IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM public.tema_recursos tr
          JOIN public.temas_momentos tm ON tm.id = tr.tema_id
          WHERE tr.recurso_id = _recurso_id AND tm.cluster_id IS NOT NULL
        )
      )
    );
$function$;