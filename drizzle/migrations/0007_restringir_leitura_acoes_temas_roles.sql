-- Ações: só quem pode ver a ação (visibilidade, projeto, inscrição, formador, entidade ou equipa)
CREATE OR REPLACE FUNCTION public.user_can_read_acao(_user_id uuid, _action_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.user_can_see_acao(_user_id, _action_id)
    OR EXISTS (SELECT 1 FROM public.inscritos_acoes i WHERE i.action_id = _action_id AND i.user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.formadores_acoes f WHERE f.action_id = _action_id AND f.user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.acoes a
      JOIN public.utilizadores u ON u.id = _user_id
      WHERE a.id = _action_id AND a.entity_id IS NOT NULL AND a.entity_id = u.entity_id
    )
  );
$$;

DROP POLICY IF EXISTS "Authenticated can view actions" ON public.acoes;
CREATE POLICY "Users view actions they can access"
ON public.acoes FOR SELECT TO authenticated
USING (public.user_can_read_acao(auth.uid(), id));

-- O email do responsável só é lido pela gestão no servidor
REVOKE SELECT ON public.acoes FROM anon, authenticated;
GRANT SELECT (
  id, entity_id, registration_status, created_at, required_fields, max_capacity, notion_id,
  program_id, title, description, start_date, end_date, created_by, fotos_link,
  avaliacao_satisfacao, avaliacao_satisfacao_link, avaliacao_impacto, avaliacao_impacto_link,
  status, action_type, conteudo_pagina_inscricao, formato, localizacao, produto, projeto, pais,
  cover_url, cover_position, cover_scale, produto_id, visibilidade
) ON public.acoes TO authenticated;

-- Temas: equipa, formadores, quem tem acesso ao cluster ou permissão do perfil para o cluster
CREATE OR REPLACE FUNCTION public.user_can_access_tema(_user_id uuid, _tema_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_equipa(_user_id)
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
$$;

DROP POLICY IF EXISTS "Authenticated can view temas" ON public.temas_momentos;
CREATE POLICY "Users view temas they can access"
ON public.temas_momentos FOR SELECT TO authenticated
USING (public.user_can_access_tema(auth.uid(), id));

DROP POLICY IF EXISTS "Authenticated can view tema_recursos" ON public.tema_recursos;
CREATE POLICY "Users view tema_recursos they can access"
ON public.tema_recursos FOR SELECT TO authenticated
USING (public.user_can_access_tema(auth.uid(), tema_id));

-- Perfis: equipa vê todos; restantes só os seus
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.roles;
CREATE POLICY "Users view own roles or equipa views all"
ON public.roles FOR SELECT TO authenticated
USING (
  public.is_equipa(auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_name = roles.name)
);

-- Permissões: equipa vê todas; restantes só as dos seus perfis
DROP POLICY IF EXISTS "Authenticated can view permissions" ON public.permissoes_roles;
CREATE POLICY "Users view own role permissions or equipa views all"
ON public.permissoes_roles FOR SELECT TO authenticated
USING (
  public.is_equipa(auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role_name = permissoes_roles.role_name)
);