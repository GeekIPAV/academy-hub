-- Ano letivo, replicações e planos (Fase 3 do plano de desbloqueio por etapas).
--
-- * Acesso à FTC e à Semana Ubuntu até ao fim do ano letivo da FTP. O dia de
--   fecho fica configurável por programa (fim_acesso, 'MM-DD', 31/08 por
--   omissão) porque a decisão (31/07 ou 31/08) está em aberto. Aviso para
--   descarregar N dias antes.
-- * Semana Ubuntu e replicações: a escola envia o Excel dos alunos
--   (semana_ubuntu_alunos, bucket privado 'semana-ubuntu') e descarrega o
--   modelo de autorização dos Encarregados de Educação; a equipa é avisada.
-- * Planos A, B e C por projeto, com limites de escolas, Educadores e
--   replicações. Bloquear ou só avisar fica por projeto (plano_bloqueia).

ALTER TABLE public.programas
  ADD COLUMN IF NOT EXISTS fim_acesso text NOT NULL DEFAULT '08-31'
    CHECK (fim_acesso ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  ADD COLUMN IF NOT EXISTS aviso_fim_acesso_dias integer NOT NULL DEFAULT 30
    CHECK (aviso_fim_acesso_dias BETWEEN 0 AND 120);

ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS plano text CHECK (plano IS NULL OR plano IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS plano_bloqueia boolean NOT NULL DEFAULT false;

-- Ficheiros dos alunos para a Semana Ubuntu: da formação (cohort_id, slot
-- escolhido pela escola) ou de uma replicação (acao_id, ação da escola).
CREATE TABLE IF NOT EXISTS public.semana_ubuntu_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  cohort_id uuid REFERENCES public.entidades_programas(id) ON DELETE CASCADE,
  acao_id uuid REFERENCES public.acoes(id) ON DELETE CASCADE,
  ficheiro_path text NOT NULL,
  ficheiro_nome text NOT NULL,
  enviado_por uuid,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (cohort_id IS NOT NULL OR acao_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS semana_ubuntu_alunos_cohort_idx ON public.semana_ubuntu_alunos (cohort_id);
CREATE INDEX IF NOT EXISTS semana_ubuntu_alunos_acao_idx ON public.semana_ubuntu_alunos (acao_id);
ALTER TABLE public.semana_ubuntu_alunos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipa le alunos da Semana Ubuntu" ON public.semana_ubuntu_alunos;
CREATE POLICY "Equipa le alunos da Semana Ubuntu" ON public.semana_ubuntu_alunos
  FOR SELECT TO authenticated USING (public.is_equipa(auth.uid()));

-- Bucket privado: os ficheiros só se leem com links assinados pelo servidor.
INSERT INTO storage.buckets (id, name, public)
VALUES ('semana-ubuntu', 'semana-ubuntu', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ---------------------------------------------------------------------------
-- Fim do acesso: o primeiro dia MM-DD a partir da data da FTP.
-- Espelhado em src/lib/ftp-calendario.ts (fimAcessoAnoLetivo).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fim_acesso_ftp(_ftp date, _mmdd text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m integer := split_part(_mmdd, '-', 1)::integer;
  d integer := split_part(_mmdd, '-', 2)::integer;
  candidato date;
BEGIN
  IF _ftp IS NULL THEN RETURN NULL; END IF;
  candidato := (make_date(extract(year FROM _ftp)::integer, m, 1) + (d - 1) * interval '1 day')::date;
  IF candidato < _ftp THEN
    candidato := (make_date(extract(year FROM _ftp)::integer + 1, m, 1) + (d - 1) * interval '1 day')::date;
  END IF;
  RETURN candidato;
END;
$$;

-- Aviso para descarregar os materiais antes do fecho.
CREATE OR REPLACE FUNCTION public.fim_acesso_alertas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total integer;
BEGIN
  WITH alvo AS (
    SELECT DISTINCT ip.user_id, a.id AS ftp_id, p.ftc_curso_id,
      public.fim_acesso_ftp(a.start_date, p.fim_acesso) AS fim
    FROM public.acoes a
    JOIN public.entidades_programas ep ON ep.ftp_acao_id = a.id
    JOIN public.programas p ON p.id = ep.program_id
    JOIN public.inscritos_programa ip ON ip.cohort_id = ep.id AND ip.status IN ('aprovada', 'concluido')
    WHERE a.action_type = 'FTP'
      AND a.start_date IS NOT NULL
      AND ip.user_id IS NOT NULL
      AND current_date BETWEEN public.fim_acesso_ftp(a.start_date, p.fim_acesso) - p.aviso_fim_acesso_dias
                           AND public.fim_acesso_ftp(a.start_date, p.fim_acesso)
  ),
  novos AS (
    INSERT INTO public.ftp_alertas (user_id, ftp_acao_id, tipo)
    SELECT user_id, ftp_id, 'fim_acesso' FROM alvo
    ON CONFLICT (user_id, ftp_acao_id, tipo) DO NOTHING
    RETURNING user_id, ftp_acao_id
  ),
  enviados AS (
    INSERT INTO public.notificacoes (user_id, title, message, link)
    SELECT n.user_id,
      'Descarrega os teus materiais',
      'O acesso à FTC e à Semana Ubuntu termina a ' || to_char(al.fim, 'DD/MM/YYYY')
        || '. Descarrega o teu caderno de percurso e os materiais de que precisas: os conteúdos vão sendo atualizados e só ficam disponíveis a contextos de implementação do programa.',
      CASE WHEN al.ftc_curso_id IS NOT NULL THEN '/elearning/' || al.ftc_curso_id || '/caderno' ELSE '/dashboard' END
    FROM novos n
    JOIN alvo al ON al.user_id = n.user_id AND al.ftp_id = n.ftp_acao_id
    RETURNING 1
  )
  SELECT count(*) INTO total FROM enviados;
  RETURN total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fim_acesso_alertas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fim_acesso_alertas() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'fim-acesso-alertas';
    PERFORM cron.schedule('fim-acesso-alertas', '23 7 * * *', 'SELECT public.fim_acesso_alertas()');
  END IF;
END;
$$;
