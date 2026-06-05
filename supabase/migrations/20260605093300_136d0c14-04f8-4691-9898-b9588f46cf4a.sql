-- Harden utilizadores update policy: prevent non-admins from changing role via API.
-- Trigger already blocks it, but add WITH CHECK as defense-in-depth.
DROP POLICY IF EXISTS "Users update own profile" ON public.utilizadores;
CREATE POLICY "Users update own profile"
  ON public.utilizadores
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role IS NOT DISTINCT FROM (SELECT u.role FROM public.utilizadores u WHERE u.id = auth.uid())
  );