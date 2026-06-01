ALTER TABLE public.utilizadores ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS utilizadores_email_unique_idx ON public.utilizadores (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS utilizadores_email_lower_idx ON public.utilizadores (lower(email));