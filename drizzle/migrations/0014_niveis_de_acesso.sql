-- Níveis de acesso.
--
-- * Admin e Equipa IPAV têm acesso a tudo: is_admin passa a incluir a Equipa
--   IPAV (todas as regras RLS que usam is_admin passam a valer para ambos).
--   Espelhado em src/lib/acesso.ts e src/lib/admin-access.server.ts.
-- * Utilizador, Entidade e Teste veem só as rotas que fazem sentido para eles
--   (ROTAS_POR_PAPEL em src/lib/acesso.ts). O Utilizador ganha o E-learning
--   (precisa da FTC) e as Ações; a Entidade ganha as Ações.
-- * Badges: a Equipa IPAV atribui e retira; a Entidade só vê os badges das
--   pessoas da sua organização (antes via os de toda a gente).

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'Admin') OR public.has_role(_user_id, 'Equipa IPAV');
$$;

-- Rotas por papel: acrescenta as que faltam e retira as que não estão na lista.
WITH matriz(role_name, resource_id) AS (
  VALUES
    ('Utilizador', '/dashboard'), ('Utilizador', '/acoes'), ('Utilizador', '/actions'), ('Utilizador', '/elearning'),
    ('Utilizador', '/recursos'), ('Utilizador', '/publicacoes/revistas'), ('Utilizador', '/publicacoes/biblioteca'),
    ('Utilizador', '/comunicacao/propriedade-intelectual'), ('Utilizador', '/faqs'),
    ('Entidade', '/dashboard'), ('Entidade', '/entidade/dashboard'), ('Entidade', '/acoes'), ('Entidade', '/actions'),
    ('Entidade', '/recursos'), ('Entidade', '/publicacoes/revistas'), ('Entidade', '/publicacoes/biblioteca'),
    ('Entidade', '/comunicacao/propriedade-intelectual'), ('Entidade', '/faqs'),
    ('Teste', '/dashboard'), ('Teste', '/acoes'), ('Teste', '/actions'), ('Teste', '/elearning'),
    ('Teste', '/recursos'), ('Teste', '/publicacoes/revistas'), ('Teste', '/publicacoes/biblioteca'),
    ('Teste', '/comunicacao/propriedade-intelectual'), ('Teste', '/faqs')
),
apagadas AS (
  DELETE FROM public.permissoes_roles pr
  WHERE pr.tipo = 'rota'
    AND pr.role_name IN ('Utilizador', 'Entidade', 'Teste')
    AND NOT EXISTS (SELECT 1 FROM matriz m WHERE m.role_name = pr.role_name AND m.resource_id = pr.resource_id)
  RETURNING 1
)
INSERT INTO public.permissoes_roles (role_name, resource_id, tipo)
SELECT m.role_name, m.resource_id, 'rota'
FROM matriz m
WHERE EXISTS (SELECT 1 FROM public.roles r WHERE r.name = m.role_name)
ON CONFLICT (role_name, resource_id, tipo) DO NOTHING;

-- Equipa IPAV: todas as rotas de gestão na matriz, para a Central de Comando
-- mostrar o acesso real (o acesso já vem de is_admin e do código).
INSERT INTO public.permissoes_roles (role_name, resource_id, tipo)
SELECT 'Equipa IPAV', r.resource_id, 'rota'
FROM (SELECT DISTINCT resource_id FROM public.permissoes_roles WHERE role_name = 'Admin' AND tipo = 'rota') r
WHERE EXISTS (SELECT 1 FROM public.roles WHERE name = 'Equipa IPAV')
ON CONFLICT (role_name, resource_id, tipo) DO NOTHING;

-- Badges.
DROP POLICY IF EXISTS "Admins assign badges" ON public.user_badges;
CREATE POLICY "Admins assign badges" ON public.user_badges
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins revoke badges" ON public.user_badges;
CREATE POLICY "Admins revoke badges" ON public.user_badges
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.e_da_minha_organizacao(_contacto uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _contacto IS NOT NULL AND _user IS NOT NULL AND public.has_role(_contacto, 'Entidade') AND (
    EXISTS (
      SELECT 1 FROM public.utilizadores c JOIN public.utilizadores u ON u.entity_id = c.entity_id
      WHERE c.id = _contacto AND u.id = _user AND c.entity_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.utilizadores c
      JOIN public.entidades_programas ep ON ep.entity_id = c.entity_id
      JOIN public.inscritos_programa ip ON ip.cohort_id = ep.id
      WHERE c.id = _contacto AND ip.user_id = _user AND c.entity_id IS NOT NULL
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.e_da_minha_organizacao(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.e_da_minha_organizacao(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Read own badges or admin/entidade" ON public.user_badges;
CREATE POLICY "Read own badges or admin/entidade" ON public.user_badges
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
    OR public.e_da_minha_organizacao(auth.uid(), user_id)
  );
