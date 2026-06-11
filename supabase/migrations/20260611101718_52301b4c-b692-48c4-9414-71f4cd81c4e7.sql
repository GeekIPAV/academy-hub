
ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS info_pdf_url text;

CREATE TABLE IF NOT EXISTS public.inscricoes_entidade_programa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, program_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes_entidade_programa TO authenticated;
GRANT ALL ON public.inscricoes_entidade_programa TO service_role;

ALTER TABLE public.inscricoes_entidade_programa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity members view own enrollments"
  ON public.inscricoes_entidade_programa FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
  );

CREATE POLICY "Entity members create own enrollments"
  ON public.inscricoes_entidade_programa FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
  );

CREATE POLICY "Admins update enrollments"
  ON public.inscricoes_entidade_programa FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete enrollments"
  ON public.inscricoes_entidade_programa FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_inscricoes_entidade_programa_updated_at
  BEFORE UPDATE ON public.inscricoes_entidade_programa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
