
-- 1. program_cohorts: restrict SELECT to authenticated users; protect invite_token column
DROP POLICY IF EXISTS "Public can read cohort tokens" ON public.program_cohorts;
CREATE POLICY "Authenticated can read cohorts"
  ON public.program_cohorts FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT (invite_token) ON public.program_cohorts FROM anon, authenticated;

-- 2. Storage: drop the public read policy on resources bucket
DROP POLICY IF EXISTS "Public can read resources" ON storage.objects;

-- 3. Prevent users from escalating their own role
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can change role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 4. Tighten EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_next_in_line(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_in_line(uuid) TO service_role;
