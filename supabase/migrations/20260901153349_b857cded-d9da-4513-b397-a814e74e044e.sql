CREATE TABLE public.paginas_avaliacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  blocks jsonb NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  cover_url text,
  cover_position text NOT NULL DEFAULT '50% 50%',
  cover_scale numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paginas_avaliacao TO authenticated;
GRANT ALL ON public.paginas_avaliacao TO service_role;
ALTER TABLE public.paginas_avaliacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view evaluation pages" ON public.paginas_avaliacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "IPAV team can create evaluation pages" ON public.paginas_avaliacao FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'Equipa IPAV'));
CREATE POLICY "IPAV team can edit evaluation pages" ON public.paginas_avaliacao FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'Equipa IPAV')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'Equipa IPAV'));
CREATE POLICY "IPAV team can remove evaluation pages" ON public.paginas_avaliacao FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'Equipa IPAV'));
CREATE TRIGGER paginas_avaliacao_set_updated_at BEFORE UPDATE ON public.paginas_avaliacao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.paginas_avaliacao (slug, title, sort_order, blocks) VALUES
  ('avaliacao-socioemocional-estudantes', 'Avaliação socioemocional longitudinal de estudantes', 1, '{"blocks":[]}'::jsonb),
  ('avaliacao-socioemocional-educadores', 'Avaliação socioemocional longitudinal de educadores', 2, '{"blocks":[]}'::jsonb),
  ('indicadores-cidadania-ativa', 'Indicadores de cidadania ativa', 3, '{"blocks":[]}'::jsonb),
  ('impacto-comunitario', 'Impacto comunitário', 4, '{"blocks":[]}'::jsonb),
  ('narrativas-de-transformacao', 'Narrativas de transformação', 5, '{"blocks":[]}'::jsonb);