ALTER TABLE public.clusters
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric NOT NULL DEFAULT 1;

ALTER TABLE public.cluster_covers
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric NOT NULL DEFAULT 1;

ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric NOT NULL DEFAULT 1;

ALTER TABLE public.recursos
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric NOT NULL DEFAULT 1;

ALTER TABLE public.temas_momentos
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%',
  ADD COLUMN IF NOT EXISTS cover_scale numeric NOT NULL DEFAULT 1;

ALTER TABLE public.clusters
  ADD CONSTRAINT clusters_cover_scale_range CHECK (cover_scale >= 1 AND cover_scale <= 4);
ALTER TABLE public.cluster_covers
  ADD CONSTRAINT cluster_covers_cover_scale_range CHECK (cover_scale >= 1 AND cover_scale <= 4);
ALTER TABLE public.badges
  ADD CONSTRAINT badges_cover_scale_range CHECK (cover_scale >= 1 AND cover_scale <= 4);
ALTER TABLE public.recursos
  ADD CONSTRAINT recursos_cover_scale_range CHECK (cover_scale >= 1 AND cover_scale <= 4);
ALTER TABLE public.temas_momentos
  ADD CONSTRAINT temas_momentos_cover_scale_range CHECK (cover_scale >= 1 AND cover_scale <= 4);