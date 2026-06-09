
-- 1) Hide internal_notes from non-admin users (column-level privilege)
REVOKE SELECT ON public.inscritos_acoes FROM authenticated;
GRANT SELECT (id, user_id, action_id, status, submitted_at, user_observations, additional_data, invited_at, tshirt_size, certificate_sent, certificate_url, certificate_sent_at)
  ON public.inscritos_acoes TO authenticated;
REVOKE UPDATE (internal_notes) ON public.inscritos_acoes FROM authenticated;

-- 2) Prevent privilege escalation via profile update
-- Drop fragile policy that compared role to a subquery against the same row
DROP POLICY IF EXISTS "Users update own profile" ON public.utilizadores;

CREATE POLICY "Users update own profile"
  ON public.utilizadores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Enforce role immutability for non-admins via trigger (defence in depth)
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can change the role field';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS utilizadores_prevent_role_escalation ON public.utilizadores;
CREATE TRIGGER utilizadores_prevent_role_escalation
  BEFORE UPDATE ON public.utilizadores
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();
