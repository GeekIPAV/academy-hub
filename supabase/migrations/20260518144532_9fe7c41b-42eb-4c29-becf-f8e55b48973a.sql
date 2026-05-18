ALTER TABLE public.acoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS action_type text;

-- Permitir que representantes de entidade criem e atualizem (cancelem) ações da sua própria entidade
DROP POLICY IF EXISTS "Entity rep can insert own actions" ON public.acoes;
CREATE POLICY "Entity rep can insert own actions"
ON public.acoes
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Entity rep can update own actions" ON public.acoes;
CREATE POLICY "Entity rep can update own actions"
ON public.acoes
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
  OR entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
);