CREATE TABLE public.cursos_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.utilizadores(id) ON DELETE CASCADE,
  passo_id uuid NOT NULL REFERENCES public.cursos_passos(id) ON DELETE CASCADE,
  texto text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, passo_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cursos_notas TO authenticated;
GRANT ALL ON public.cursos_notas TO service_role;

ALTER TABLE public.cursos_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas próprias leitura"
ON public.cursos_notas FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notas próprias criação"
ON public.cursos_notas FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notas próprias edição"
ON public.cursos_notas FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notas próprias eliminação"
ON public.cursos_notas FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER cursos_notas_upd
BEFORE UPDATE ON public.cursos_notas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();