-- Campos do plano de sessão (modelo "00_PlanoSessao"): dados gerais do tema
-- e, por bloco, o tipo de momento e os objetivos. Todos opcionais.
ALTER TABLE public.temas_momentos
  ADD COLUMN IF NOT EXISTS pilares text,
  ADD COLUMN IF NOT EXISTS ter_em_atencao text,
  ADD COLUMN IF NOT EXISTS orientacoes text,
  ADD COLUMN IF NOT EXISTS local text;

ALTER TABLE public.plano_sessao_blocos
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS objetivos text;
