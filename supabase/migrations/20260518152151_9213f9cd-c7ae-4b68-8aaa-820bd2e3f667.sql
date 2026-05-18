ALTER TABLE public.participantes_acoes
  ADD COLUMN IF NOT EXISTS certificate_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS certificate_url text,
  ADD COLUMN IF NOT EXISTS certificate_sent_at timestamptz;