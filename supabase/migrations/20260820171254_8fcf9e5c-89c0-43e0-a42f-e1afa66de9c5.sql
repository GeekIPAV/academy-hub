ALTER TABLE public.acoes
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric NOT NULL DEFAULT 1;