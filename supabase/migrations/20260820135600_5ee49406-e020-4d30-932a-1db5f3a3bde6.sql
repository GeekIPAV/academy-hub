-- Guard entity_id/role changes via trigger instead of a fragile RLS WITH CHECK subquery
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only administrators can change the role field';
  END IF;
  IF NEW.entity_id IS DISTINCT FROM OLD.entity_id THEN
    RAISE EXCEPTION 'Only administrators can change the entity field';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS utilizadores_prevent_privilege_change ON public.utilizadores;
CREATE TRIGGER utilizadores_prevent_privilege_change
  BEFORE UPDATE ON public.utilizadores
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_change();

DROP POLICY IF EXISTS "Users update own profile" ON public.utilizadores;
CREATE POLICY "Users update own profile"
  ON public.utilizadores FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_change() FROM public, anon, authenticated;