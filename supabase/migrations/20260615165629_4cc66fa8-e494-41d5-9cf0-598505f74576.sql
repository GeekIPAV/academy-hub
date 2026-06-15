DROP POLICY IF EXISTS "Utilizadores autenticados podem ver alocações" ON public.entidades_projetos;

CREATE POLICY "Admins e membros da entidade podem ver alocações"
ON public.entidades_projetos
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR entity_id IN (
    SELECT u.entity_id FROM public.utilizadores u
    WHERE u.id = auth.uid() AND u.entity_id IS NOT NULL
  )
);