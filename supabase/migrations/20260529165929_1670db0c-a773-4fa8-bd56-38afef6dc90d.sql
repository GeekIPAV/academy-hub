
ALTER TABLE public.temas_momentos
  ADD COLUMN IF NOT EXISTS hidden_sections text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.plano_sessao_blocos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id uuid NOT NULL REFERENCES public.temas_momentos(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  title text,
  description text,
  duration_minutes integer,
  schedule text,
  recurso_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_sessao_blocos TO authenticated;
GRANT ALL ON public.plano_sessao_blocos TO service_role;

ALTER TABLE public.plano_sessao_blocos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view plano_sessao_blocos"
  ON public.plano_sessao_blocos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage plano_sessao_blocos"
  ON public.plano_sessao_blocos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_plano_sessao_blocos_tema ON public.plano_sessao_blocos(tema_id, sort_order);

CREATE TRIGGER set_plano_sessao_blocos_updated_at
  BEFORE UPDATE ON public.plano_sessao_blocos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
