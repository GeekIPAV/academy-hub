ALTER TABLE public.temas_momentos
  ADD COLUMN IF NOT EXISTS intro text,
  ADD COLUMN IF NOT EXISTS processo_u text,
  ADD COLUMN IF NOT EXISTS cover_url text;