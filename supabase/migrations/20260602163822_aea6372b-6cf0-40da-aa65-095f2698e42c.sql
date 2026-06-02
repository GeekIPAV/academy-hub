ALTER TABLE public.utilizadores
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;