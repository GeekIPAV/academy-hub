
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view roles"
ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert roles"
ON public.roles FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.roles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.roles FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_system_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'Cannot delete a system role';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_system AND NEW.name IS DISTINCT FROM OLD.name THEN
      RAISE EXCEPTION 'Cannot rename a system role';
    END IF;
    IF OLD.is_system AND NEW.is_system = false THEN
      RAISE EXCEPTION 'Cannot unmark a system role';
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_system_roles_trigger
BEFORE UPDATE OR DELETE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.protect_system_roles();

INSERT INTO public.roles (name, description, is_system) VALUES
  ('Admin', 'Administrador do sistema', true),
  ('Formador', 'Formador de ações', true),
  ('Formando', 'Participante em ações', true),
  ('Entidade', 'Representante de entidade', true);
