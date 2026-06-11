ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'formado';
ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_kind_check;
ALTER TABLE public.badges ADD CONSTRAINT badges_kind_check CHECK (kind IN ('em_formacao','formado'));