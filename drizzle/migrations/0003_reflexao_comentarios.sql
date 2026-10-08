ALTER TABLE public.cursos_progresso
  ADD COLUMN IF NOT EXISTS comentario text,
  ADD COLUMN IF NOT EXISTS comentario_autor_id uuid,
  ADD COLUMN IF NOT EXISTS comentario_autor_nome text,
  ADD COLUMN IF NOT EXISTS comentario_em timestamptz;