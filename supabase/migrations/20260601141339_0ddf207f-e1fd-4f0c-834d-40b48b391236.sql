ALTER TABLE public.recursos
  ADD COLUMN IF NOT EXISTS cover_position text DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric DEFAULT 1;

ALTER TABLE public.temas_momentos
  ADD COLUMN IF NOT EXISTS cover_position text DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric DEFAULT 1;

ALTER TABLE public.clusters
  ADD COLUMN IF NOT EXISTS cover_position text DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric DEFAULT 1;