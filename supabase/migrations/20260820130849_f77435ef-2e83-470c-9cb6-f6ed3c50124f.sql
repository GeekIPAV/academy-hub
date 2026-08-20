DROP POLICY IF EXISTS "Users can insert own enrollment" ON public.inscritos_programa;
DROP POLICY IF EXISTS "Users update own program enrollments" ON public.inscritos_programa;
REVOKE INSERT, UPDATE ON public.inscritos_programa FROM anon, authenticated;
GRANT SELECT ON public.inscritos_programa TO authenticated;
GRANT ALL ON public.inscritos_programa TO service_role;