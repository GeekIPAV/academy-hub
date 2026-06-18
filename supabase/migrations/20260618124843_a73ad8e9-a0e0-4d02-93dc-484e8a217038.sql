
-- Fix privilege escalation: prevent self-reassignment of entity_id/role on utilizadores
DROP POLICY IF EXISTS "Users update own profile" ON public.utilizadores;
CREATE POLICY "Users update own profile"
  ON public.utilizadores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND entity_id IS NOT DISTINCT FROM (SELECT u.entity_id FROM public.utilizadores u WHERE u.id = auth.uid())
    AND role IS NOT DISTINCT FROM (SELECT u.role FROM public.utilizadores u WHERE u.id = auth.uid())
  );

-- Restrict programas SELECT to authenticated users (was public)
DROP POLICY IF EXISTS "Public can view programs" ON public.programas;
CREATE POLICY "Authenticated can view programs"
  ON public.programas
  FOR SELECT
  TO authenticated
  USING (true);
