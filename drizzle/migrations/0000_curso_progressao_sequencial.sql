ALTER TABLE public.cursos ADD COLUMN progressao_sequencial boolean NOT NULL DEFAULT false;
UPDATE public.cursos SET progressao_sequencial = true WHERE id = '11b630c3-de83-480b-88dd-9e2ee6c65a71';