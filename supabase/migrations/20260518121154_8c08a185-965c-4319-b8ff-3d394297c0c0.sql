
-- 1. Junction table
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES public.utilizadores(id) ON DELETE CASCADE,
  role_name text NOT NULL REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE RESTRICT,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_name)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own roles or admin views all"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins assign roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins remove roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. Backfill from existing utilizadores.role
INSERT INTO public.user_roles (user_id, role_name)
SELECT u.id, u.role
FROM public.utilizadores u
WHERE u.role IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.roles r WHERE r.name = u.role)
ON CONFLICT DO NOTHING;

-- 3. has_role helper (note: is_admin already exists; redefine to use user_roles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role_name = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'Admin');
$$;

-- 4. handle_new_user: also seed user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.utilizadores (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), 'Formando')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (NEW.id, 'Formando')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5. Sync utilizadores.role (primary role) from user_roles for legacy compatibility
CREATE OR REPLACE FUNCTION public.sync_primary_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user uuid;
  new_primary text;
BEGIN
  target_user := COALESCE(NEW.user_id, OLD.user_id);
  SELECT role_name INTO new_primary
  FROM public.user_roles
  WHERE user_id = target_user
  ORDER BY
    CASE role_name WHEN 'Admin' THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1;
  UPDATE public.utilizadores SET role = new_primary WHERE id = target_user;
  RETURN NULL;
END;
$$;

CREATE TRIGGER user_roles_sync_primary
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_primary_role();
