
-- Temporarily disable trigger during normalization
ALTER TABLE public.utilizadores DISABLE TRIGGER USER;

UPDATE public.utilizadores SET role = initcap(role) WHERE role IS NOT NULL;

ALTER TABLE public.utilizadores ENABLE TRIGGER USER;

-- Update is_admin to compare against 'Admin'
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.utilizadores WHERE id = _user_id AND role = 'Admin');
$function$;

ALTER TABLE public.utilizadores ALTER COLUMN role SET DEFAULT 'Formando';

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.utilizadores (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), 'Formando')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Ensure unique constraint on roles.name (needed for FK)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_name_key') THEN
    ALTER TABLE public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);
  END IF;
END$$;

ALTER TABLE public.utilizadores
  ADD CONSTRAINT utilizadores_role_fkey
  FOREIGN KEY (role) REFERENCES public.roles(name)
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE POLICY "Admins update any profile"
ON public.utilizadores
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
