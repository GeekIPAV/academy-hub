ALTER TABLE public.entidades
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS locality text;

ALTER TABLE public.utilizadores
  ADD COLUMN IF NOT EXISTS entity_id uuid REFERENCES public.entidades(id) ON DELETE SET NULL;

CREATE POLICY "Entity rep or admin can update entidade"
ON public.entidades
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
);