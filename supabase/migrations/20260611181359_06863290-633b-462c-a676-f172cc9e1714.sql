
ALTER TABLE public.utilizadores
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS locality text,
  ADD COLUMN IF NOT EXISTS cedula_profissional text,
  ADD COLUMN IF NOT EXISTS grupo_recrutamento text,
  ADD COLUMN IF NOT EXISTS escola_educando text,
  ADD COLUMN IF NOT EXISTS funcao_laboral_detalhe text;
