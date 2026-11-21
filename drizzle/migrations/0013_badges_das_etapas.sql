-- Badges integrados na jornada.
--
-- * Cada etapa da jornada dá um badge, configurado num só sítio por programa:
--   inscrição (badge_inscricao_id, por omissão o badge de formando do
--   cluster), FTC concluída (badge final do curso da FTC), presença na FTP
--   (su_badge_id, já existia) e Sessão Final (badge_final_id, por omissão o
--   badge final do cluster).
-- * Renovação depois do fim do ano letivo (renovacao_ativa, badge_renovacao_id).
-- * Badges de etapa dados à mão sem a etapa cumprida ficam registados como
--   exceção, com motivo, em badge_excecoes; a jornada mostra-os como
--   «Por decisão da equipa».

ALTER TABLE public.programas
  ADD COLUMN IF NOT EXISTS badge_inscricao_id uuid REFERENCES public.badges(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS badge_final_id uuid REFERENCES public.badges(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renovacao_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_renovacao_id uuid REFERENCES public.badges(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.badge_excecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programas(id) ON DELETE CASCADE,
  etapa text NOT NULL CHECK (etapa IN ('inscricao', 'ftc', 'presenca_ftp', 'sessao_final', 'renovacao')),
  motivo text NOT NULL CHECK (length(trim(motivo)) > 0),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  retirado_em timestamptz,
  retirado_por uuid
);
CREATE INDEX IF NOT EXISTS badge_excecoes_user_idx ON public.badge_excecoes (user_id, badge_id) WHERE retirado_em IS NULL;
ALTER TABLE public.badge_excecoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipa le excecoes de badges" ON public.badge_excecoes;
CREATE POLICY "Equipa le excecoes de badges" ON public.badge_excecoes
  FOR SELECT TO authenticated USING (public.is_equipa(auth.uid()));
