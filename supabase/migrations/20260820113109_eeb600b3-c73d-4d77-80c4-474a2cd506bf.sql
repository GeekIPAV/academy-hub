-- 1. entidades_programas: estado + auditoria
ALTER TABLE public.entidades_programas
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aprovada',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entidades_programas_status_check'
  ) THEN
    ALTER TABLE public.entidades_programas
      ADD CONSTRAINT entidades_programas_status_check
      CHECK (status IN ('pendente','aprovada','rejeitada'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_entidades_programas_updated_at ON public.entidades_programas;
CREATE TRIGGER set_entidades_programas_updated_at
BEFORE UPDATE ON public.entidades_programas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. programas: token público de inscrição de organizações
ALTER TABLE public.programas
  ADD COLUMN IF NOT EXISTS public_enroll_token text;

CREATE UNIQUE INDEX IF NOT EXISTS programas_public_enroll_token_key
  ON public.programas (public_enroll_token)
  WHERE public_enroll_token IS NOT NULL;

UPDATE public.programas
   SET public_enroll_token = encode(gen_random_bytes(8), 'hex')
 WHERE public_enroll_token IS NULL;

-- 3. Migrar inscricoes_entidade_programa -> entidades_programas
INSERT INTO public.entidades_programas (entity_id, program_id, is_active, status, created_by, created_at)
SELECT i.entity_id,
       i.program_id,
       true,
       CASE WHEN lower(i.status) IN ('aprovada','aprovado','ativa','ativo','aceite','confirmada')
            THEN 'aprovada'
            WHEN lower(i.status) IN ('rejeitada','rejeitado','recusada')
            THEN 'rejeitada'
            ELSE 'pendente' END,
       i.requested_by,
       i.created_at
FROM public.inscricoes_entidade_programa i
WHERE NOT EXISTS (
  SELECT 1 FROM public.entidades_programas ep
  WHERE ep.entity_id = i.entity_id AND ep.program_id = i.program_id
);

-- 4. Acesso da Equipa IPAV
CREATE OR REPLACE FUNCTION public.is_equipa(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'Admin') OR public.has_role(_user_id, 'Equipa IPAV');
$$;

DROP POLICY IF EXISTS "Equipa can view entidades" ON public.entidades;
CREATE POLICY "Equipa can view entidades" ON public.entidades
  FOR SELECT TO authenticated USING (public.is_equipa(auth.uid()));

DROP POLICY IF EXISTS "Equipa can update entidades" ON public.entidades;
CREATE POLICY "Equipa can update entidades" ON public.entidades
  FOR UPDATE TO authenticated USING (public.is_equipa(auth.uid()))
  WITH CHECK (public.is_equipa(auth.uid()));

DROP POLICY IF EXISTS "Equipa can view cohorts" ON public.entidades_programas;
CREATE POLICY "Equipa can view cohorts" ON public.entidades_programas
  FOR SELECT TO authenticated USING (public.is_equipa(auth.uid()));

DROP POLICY IF EXISTS "Equipa can update cohorts" ON public.entidades_programas;
CREATE POLICY "Equipa can update cohorts" ON public.entidades_programas
  FOR UPDATE TO authenticated USING (public.is_equipa(auth.uid()))
  WITH CHECK (public.is_equipa(auth.uid()));

DROP POLICY IF EXISTS "Equipa view program enrollments" ON public.inscritos_programa;
CREATE POLICY "Equipa view program enrollments" ON public.inscritos_programa
  FOR SELECT TO authenticated USING (public.is_equipa(auth.uid()));

DROP POLICY IF EXISTS "Equipa update program enrollments" ON public.inscritos_programa;
CREATE POLICY "Equipa update program enrollments" ON public.inscritos_programa
  FOR UPDATE TO authenticated USING (public.is_equipa(auth.uid()))
  WITH CHECK (public.is_equipa(auth.uid()));