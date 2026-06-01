ALTER TABLE public.utilizadores ADD COLUMN IF NOT EXISTS passport_num text;
CREATE INDEX IF NOT EXISTS idx_utilizadores_passport_num ON public.utilizadores (passport_num) WHERE passport_num IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_utilizadores_nif ON public.utilizadores (nif) WHERE nif IS NOT NULL;