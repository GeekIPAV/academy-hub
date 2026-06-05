
CREATE TABLE public.badge_role_auto_grant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (badge_id, role_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_role_auto_grant TO authenticated;
GRANT ALL ON public.badge_role_auto_grant TO service_role;

ALTER TABLE public.badge_role_auto_grant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage badge_role_auto_grant"
  ON public.badge_role_auto_grant
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can view badge_role_auto_grant"
  ON public.badge_role_auto_grant
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.auto_grant_role_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  SELECT NEW.user_id, brag.badge_id
  FROM public.badge_role_auto_grant brag
  WHERE brag.role_name = NEW.role_name
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_role_badges ON public.user_roles;
CREATE TRIGGER trg_auto_grant_role_badges
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.auto_grant_role_badges();
