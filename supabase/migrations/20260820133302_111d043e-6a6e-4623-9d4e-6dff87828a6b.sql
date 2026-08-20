ALTER TABLE public.inscritos_programa
  ADD COLUMN IF NOT EXISTS is_formador boolean NOT NULL DEFAULT false;