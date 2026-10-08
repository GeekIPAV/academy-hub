CREATE TABLE public.utilizadores_projetos (
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  PRIMARY KEY (user_id, project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utilizadores_projetos TO authenticated;
GRANT ALL ON public.utilizadores_projetos TO service_role;
ALTER TABLE public.utilizadores_projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerem utilizadores_projetos" ON public.utilizadores_projetos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Utilizador vê os seus projetos diretos" ON public.utilizadores_projetos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.acoes_projetos (
  action_id uuid NOT NULL REFERENCES public.acoes(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action_id, project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acoes_projetos TO authenticated;
GRANT ALL ON public.acoes_projetos TO service_role;
ALTER TABLE public.acoes_projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerem acoes_projetos" ON public.acoes_projetos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.acoes ADD COLUMN visibilidade text NOT NULL DEFAULT 'todos'
  CHECK (visibilidade IN ('todos','projetos'));

-- Projetos efetivos: diretos + herdados (ao vivo) da entidade ativa no projeto
CREATE OR REPLACE FUNCTION public.user_projetos_efetivos(_user_id uuid)
RETURNS TABLE(project_id uuid, origem text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT up.project_id, 'direto'::text FROM public.utilizadores_projetos up WHERE up.user_id = _user_id
  UNION
  SELECT ep.project_id, 'entidade'::text
  FROM public.utilizadores u
  JOIN public.entidades_projetos ep ON ep.entity_id = u.entity_id
  WHERE u.id = _user_id AND ep.is_active
    AND ep.data_inicio <= now() AND (ep.data_fim IS NULL OR ep.data_fim > now())
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_acao(_user_id uuid, _action_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.acoes a WHERE a.id = _action_id AND a.visibilidade = 'todos')
    OR public.is_admin(_user_id) OR public.is_equipa(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.acoes_projetos ap
      JOIN public.user_projetos_efetivos(_user_id) pe ON pe.project_id = ap.project_id
      WHERE ap.action_id = _action_id)
$$;