-- Tabela de categorias da biblioteca
CREATE TABLE public.biblioteca_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_categorias TO authenticated;
GRANT ALL ON public.biblioteca_categorias TO service_role;
ALTER TABLE public.biblioteca_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read categorias"
  ON public.biblioteca_categorias FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin can manage categorias"
  ON public.biblioteca_categorias FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER biblioteca_categorias_set_updated_at
  BEFORE UPDATE ON public.biblioteca_categorias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela de publicações
CREATE TABLE public.publicacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  summary TEXT,
  year INTEGER,
  link TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  categoria_id UUID REFERENCES public.biblioteca_categorias(id) ON DELETE SET NULL,
  is_ipav BOOLEAN NOT NULL DEFAULT false,
  proposed_by UUID REFERENCES public.utilizadores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.publicacoes TO authenticated;
GRANT ALL ON public.publicacoes TO service_role;
ALTER TABLE public.publicacoes ENABLE ROW LEVEL SECURITY;

-- Leitura: utilizadores autenticados veem aprovadas; admin vê tudo
CREATE POLICY "Auth users can read approved publicacoes"
  ON public.publicacoes FOR SELECT
  TO authenticated
  USING (status = 'aprovado' OR public.is_admin(auth.uid()) OR proposed_by = auth.uid());

-- Inserção por utilizador autenticado: tem que vir como pendente e associado ao próprio
CREATE POLICY "Auth users can propose publicacoes"
  ON public.publicacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.is_admin(auth.uid()))
    OR (status = 'pendente' AND proposed_by = auth.uid())
  );

-- Update/Delete: só admin
CREATE POLICY "Admin can update publicacoes"
  ON public.publicacoes FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete publicacoes"
  ON public.publicacoes FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER publicacoes_set_updated_at
  BEFORE UPDATE ON public.publicacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_publicacoes_status ON public.publicacoes(status);
CREATE INDEX idx_publicacoes_is_ipav ON public.publicacoes(is_ipav);
CREATE INDEX idx_publicacoes_categoria ON public.publicacoes(categoria_id);

-- Seed inicial de categorias
INSERT INTO public.biblioteca_categorias (name) VALUES
  ('Inspiração'),
  ('Livro'),
  ('Artigo'),
  ('Estudo'),
  ('Vídeo'),
  ('Relatório')
ON CONFLICT (name) DO NOTHING;