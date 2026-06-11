ALTER TABLE public.clusters
  ADD COLUMN IF NOT EXISTS formando_badge_id uuid REFERENCES public.badges(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_badge_id uuid REFERENCES public.badges(id) ON DELETE SET NULL;