DROP POLICY IF EXISTS "Authenticated can view badge_role_auto_grant" ON public.badge_role_auto_grant;
CREATE POLICY "Equipa IPAV can view badge_role_auto_grant"
  ON public.badge_role_auto_grant
  FOR SELECT TO authenticated
  USING (public.is_equipa(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view evaluation pages" ON public.paginas_avaliacao;
CREATE POLICY "IPAV team can view evaluation pages"
  ON public.paginas_avaliacao
  FOR SELECT TO authenticated
  USING (public.is_equipa(auth.uid()));