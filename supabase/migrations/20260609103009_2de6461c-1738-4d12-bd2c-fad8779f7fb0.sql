ALTER TABLE public.publicacoes ADD COLUMN language text;
CREATE INDEX IF NOT EXISTS idx_publicacoes_language ON public.publicacoes(language);