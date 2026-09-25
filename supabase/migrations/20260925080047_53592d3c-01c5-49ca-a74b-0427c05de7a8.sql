
CREATE TABLE public.cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  cover_position text NOT NULL DEFAULT '50% 50%',
  cover_scale numeric NOT NULL DEFAULT 1,
  cluster_id uuid REFERENCES public.clusters(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programas(id) ON DELETE SET NULL,
  modalidade text NOT NULL DEFAULT 'autonomo' CHECK (modalidade IN ('autonomo','turma')),
  estado text NOT NULL DEFAULT 'rascunho' CHECK (estado IN ('rascunho','publicado','arquivado')),
  tipo text NOT NULL DEFAULT 'microcurso' CHECK (tipo IN ('formacao_formadores','microcurso','semana_ubuntu','renovacao')),
  horas numeric,
  tem_certificado boolean NOT NULL DEFAULT false,
  acreditacao_ref text,
  badge_entrada_id uuid REFERENCES public.badges(id) ON DELETE SET NULL,
  badge_final_id uuid REFERENCES public.badges(id) ON DELETE SET NULL,
  badge_renovado_id uuid REFERENCES public.badges(id) ON DELETE SET NULL,
  nota_minima_quiz integer NOT NULL DEFAULT 70,
  pct_minima_video integer NOT NULL DEFAULT 90,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cursos_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  tema_id uuid REFERENCES public.temas_momentos(id) ON DELETE SET NULL,
  abertura_dias integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cursos_passos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id uuid NOT NULL REFERENCES public.cursos_modulos(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('video','texto','recurso','quiz','reflexao')),
  obrigatorio boolean NOT NULL DEFAULT true,
  duracao_min integer,
  conteudo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cursos_quiz_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passo_id uuid NOT NULL REFERENCES public.cursos_passos(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  enunciado text NOT NULL,
  tipo text NOT NULL DEFAULT 'unica' CHECK (tipo IN ('unica','multipla')),
  opcoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cursos_turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  data_inicio date,
  data_fim date,
  vagas integer,
  formador_id uuid REFERENCES public.utilizadores(id) ON DELETE SET NULL,
  inscricoes_abertas boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cursos_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.utilizadores(id) ON DELETE CASCADE,
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.cursos_turmas(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'inscrito' CHECK (estado IN ('inscrito','em_curso','concluido','cancelado')),
  inscrito_em timestamptz NOT NULL DEFAULT now(),
  iniciado_em timestamptz,
  concluido_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cursos_inscricoes_unq ON public.cursos_inscricoes (user_id, curso_id, coalesce(turma_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE TABLE public.cursos_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL REFERENCES public.cursos_inscricoes(id) ON DELETE CASCADE,
  passo_id uuid NOT NULL REFERENCES public.cursos_passos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  estado text NOT NULL DEFAULT 'em_curso' CHECK (estado IN ('nao_iniciado','em_curso','concluido')),
  video_pct numeric NOT NULL DEFAULT 0,
  video_posicao_s numeric NOT NULL DEFAULT 0,
  nota numeric,
  tentativas integer NOT NULL DEFAULT 0,
  resposta jsonb,
  partilhada boolean NOT NULL DEFAULT false,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inscricao_id, passo_id)
);
CREATE TABLE public.cursos_atividade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  inscricao_id uuid REFERENCES public.cursos_inscricoes(id) ON DELETE CASCADE,
  passo_id uuid REFERENCES public.cursos_passos(id) ON DELETE SET NULL,
  evento text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cursos_atividade_insc_idx ON public.cursos_atividade (inscricao_id, created_at);
CREATE TABLE public.certificados_elearning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL UNIQUE REFERENCES public.cursos_inscricoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  curso_id uuid NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  curso_titulo text NOT NULL,
  horas numeric,
  modalidade text,
  data_inicio date,
  data_fim date,
  storage_path text,
  emitido_em timestamptz NOT NULL DEFAULT now(),
  revogado boolean NOT NULL DEFAULT false
);

GRANT SELECT ON public.cursos, public.cursos_modulos, public.cursos_passos, public.cursos_turmas,
  public.cursos_inscricoes, public.cursos_progresso, public.cursos_atividade, public.certificados_elearning,
  public.cursos_quiz_perguntas TO authenticated;
GRANT ALL ON public.cursos, public.cursos_modulos, public.cursos_passos, public.cursos_quiz_perguntas, public.cursos_turmas,
  public.cursos_inscricoes, public.cursos_progresso, public.cursos_atividade, public.certificados_elearning TO service_role;

ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_passos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_quiz_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_elearning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cursos leitura" ON public.cursos FOR SELECT TO authenticated
  USING (estado = 'publicado' OR public.is_equipa(auth.uid()));
CREATE POLICY "modulos leitura" ON public.cursos_modulos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cursos c WHERE c.id = curso_id AND (c.estado='publicado' OR public.is_equipa(auth.uid()))));
CREATE POLICY "passos leitura" ON public.cursos_passos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cursos_modulos m JOIN public.cursos c ON c.id=m.curso_id WHERE m.id = modulo_id AND (c.estado='publicado' OR public.is_equipa(auth.uid()))));
CREATE POLICY "perguntas leitura equipa" ON public.cursos_quiz_perguntas FOR SELECT TO authenticated
  USING (public.is_equipa(auth.uid()));
CREATE POLICY "turmas leitura" ON public.cursos_turmas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cursos c WHERE c.id = curso_id AND (c.estado='publicado' OR public.is_equipa(auth.uid()))));
CREATE POLICY "inscricoes proprias" ON public.cursos_inscricoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_equipa(auth.uid()));
CREATE POLICY "progresso proprio" ON public.cursos_progresso FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_equipa(auth.uid()));
CREATE POLICY "atividade propria" ON public.cursos_atividade FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_equipa(auth.uid()));
CREATE POLICY "certificados proprios" ON public.certificados_elearning FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_equipa(auth.uid()));

CREATE TRIGGER cursos_upd BEFORE UPDATE ON public.cursos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cursos_modulos_upd BEFORE UPDATE ON public.cursos_modulos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cursos_passos_upd BEFORE UPDATE ON public.cursos_passos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cursos_quiz_upd BEFORE UPDATE ON public.cursos_quiz_perguntas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cursos_turmas_upd BEFORE UPDATE ON public.cursos_turmas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cursos_inscricoes_upd BEFORE UPDATE ON public.cursos_inscricoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cursos_progresso_upd BEFORE UPDATE ON public.cursos_progresso FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recalcular validade quando a renovação limpa expires_at
DROP TRIGGER IF EXISTS compute_user_badge_expiry_trg ON public.user_badges;
CREATE TRIGGER compute_user_badge_expiry_trg BEFORE INSERT OR UPDATE ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.compute_user_badge_expiry();
