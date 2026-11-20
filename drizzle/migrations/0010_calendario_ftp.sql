-- Calendário ancorado na FTP (Fase 1 do plano de desbloqueio por etapas).
--
-- A equipa IPAV cria as datas de FTP por programa (e projeto, via
-- acoes_projetos) como ações do tipo 'FTP' sem entidade, com vagas mínimas e
-- máximas. A pessoa de contacto de cada escola escolhe uma FTP e um slot de
-- Semana Ubuntu para a sua inscrição no programa (entidades_programas); a
-- escolha vale para todos os Educadores da escola. A FTC do programa
-- (programas.ftc_curso_id) ganha uma turma por FTP (cursos_turmas.ftp_acao_id)
-- que abre 14 dias antes da data da FTP.

ALTER TABLE public.acoes
  ADD COLUMN IF NOT EXISTS min_capacity integer CHECK (min_capacity IS NULL OR min_capacity >= 0);

ALTER TABLE public.programas
  ADD COLUMN IF NOT EXISTS ftc_curso_id uuid REFERENCES public.cursos(id) ON DELETE SET NULL;

ALTER TABLE public.entidades_programas
  ADD COLUMN IF NOT EXISTS ftp_acao_id uuid REFERENCES public.acoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS su_acao_id uuid REFERENCES public.acoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ftp_escolhida_em timestamptz,
  ADD COLUMN IF NOT EXISTS ftp_escolhida_por uuid;

CREATE INDEX IF NOT EXISTS entidades_programas_ftp_idx
  ON public.entidades_programas (ftp_acao_id) WHERE ftp_acao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS entidades_programas_su_idx
  ON public.entidades_programas (su_acao_id) WHERE su_acao_id IS NOT NULL;

ALTER TABLE public.cursos_turmas
  ADD COLUMN IF NOT EXISTS ftp_acao_id uuid REFERENCES public.acoes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cursos_turmas_ftp_unq
  ON public.cursos_turmas (curso_id, ftp_acao_id) WHERE ftp_acao_id IS NOT NULL;
