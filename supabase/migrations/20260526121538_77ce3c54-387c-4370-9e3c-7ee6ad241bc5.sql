
-- 1. entidades: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Public can view notion entities" ON public.entidades;
CREATE POLICY "Authenticated can view entidades"
ON public.entidades
FOR SELECT
TO authenticated
USING (true);

-- 2. entidades_programas: restrict SELECT to admins only (server fns use service role)
DROP POLICY IF EXISTS "Authenticated can read cohorts" ON public.entidades_programas;
CREATE POLICY "Admins can view cohorts"
ON public.entidades_programas
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 3. acoes: restrict public SELECT to authenticated
DROP POLICY IF EXISTS "Public can view actions" ON public.acoes;
CREATE POLICY "Authenticated can view actions"
ON public.acoes
FOR SELECT
TO authenticated
USING (true);

-- 4. inscritos_programa: add admin SELECT and DELETE
CREATE POLICY "Admins view all program enrollments"
ON public.inscritos_programa
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete program enrollments"
ON public.inscritos_programa
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Revoke EXECUTE from anon on SECURITY DEFINER functions in public schema
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.anonimizar_utilizador(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_primary_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.protect_system_roles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_escalation() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_utilizadores_columns() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
