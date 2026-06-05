
-- 1) Restringir SELECT em entidades a admins e ao próprio representante
DROP POLICY IF EXISTS "Authenticated can view entidades" ON public.entidades;

CREATE POLICY "Admin or own entity can view entidades"
  ON public.entidades
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR id = (
      SELECT u.entity_id FROM public.utilizadores u WHERE u.id = auth.uid()
    )
  );

-- 2) Restringir SELECT no bucket resources a admins (acesso aplicacional faz-se via signed URLs do servidor)
DROP POLICY IF EXISTS "Authenticated users can view resources" ON storage.objects;

CREATE POLICY "Admins can view resources"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'resources' AND public.is_admin(auth.uid()));
