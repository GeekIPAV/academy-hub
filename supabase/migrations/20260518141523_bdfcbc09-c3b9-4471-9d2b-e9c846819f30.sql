
-- 1. Acoes: novos campos
ALTER TABLE public.acoes
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS tshirt_tracking_link text,
  ADD COLUMN IF NOT EXISTS tshirt_value numeric,
  ADD COLUMN IF NOT EXISTS fotos_link text,
  ADD COLUMN IF NOT EXISTS avaliacao_satisfacao numeric,
  ADD COLUMN IF NOT EXISTS avaliacao_satisfacao_link text,
  ADD COLUMN IF NOT EXISTS avaliacao_impacto numeric,
  ADD COLUMN IF NOT EXISTS avaliacao_impacto_link text;

-- Permitir update das acoes por admins
DROP POLICY IF EXISTS "Admins can update actions" ON public.acoes;
CREATE POLICY "Admins can update actions"
ON public.acoes FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2. Inscritos acoes: novos campos
ALTER TABLE public.inscritos_acoes
  ADD COLUMN IF NOT EXISTS tshirt_size text,
  ADD COLUMN IF NOT EXISTS certificate_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_url text,
  ADD COLUMN IF NOT EXISTS certificate_sent_at timestamptz;

-- Admins podem ver e gerir todas as inscrições
DROP POLICY IF EXISTS "Admins view all enrollments" ON public.inscritos_acoes;
CREATE POLICY "Admins view all enrollments"
ON public.inscritos_acoes FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update enrollments" ON public.inscritos_acoes;
CREATE POLICY "Admins update enrollments"
ON public.inscritos_acoes FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete enrollments" ON public.inscritos_acoes;
CREATE POLICY "Admins delete enrollments"
ON public.inscritos_acoes FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_inscritos_acoes_action ON public.inscritos_acoes(action_id);
CREATE INDEX IF NOT EXISTS idx_inscritos_acoes_user ON public.inscritos_acoes(user_id);

-- 3. Nova tabela formadores_acoes
CREATE TABLE IF NOT EXISTS public.formadores_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.acoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tshirt_size text,
  status text NOT NULL DEFAULT 'Pendente',
  certificate_sent boolean NOT NULL DEFAULT false,
  certificate_url text,
  certificate_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (action_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_formadores_acoes_action ON public.formadores_acoes(action_id);
CREATE INDEX IF NOT EXISTS idx_formadores_acoes_user ON public.formadores_acoes(user_id);

ALTER TABLE public.formadores_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers view own trainer assignments"
ON public.formadores_acoes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins insert trainers"
ON public.formadores_acoes FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins update trainers"
ON public.formadores_acoes FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins delete trainers"
ON public.formadores_acoes FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
