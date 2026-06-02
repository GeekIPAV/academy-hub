CREATE TABLE IF NOT EXISTS public.convite_utilizacoes (
  invite_id uuid NOT NULL REFERENCES public.convites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, user_id)
);

GRANT SELECT ON public.convite_utilizacoes TO authenticated;
GRANT ALL ON public.convite_utilizacoes TO service_role;

ALTER TABLE public.convite_utilizacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view invite uses" ON public.convite_utilizacoes;
CREATE POLICY "Admins view invite uses"
ON public.convite_utilizacoes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.apply_invite_to_user(_invite_token text, _user_id uuid, _assigned_by uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv record;
  already_used boolean := false;
  inserted_use integer := 0;
  role_item text;
  has_non_formando boolean := false;
BEGIN
  IF _invite_token IS NULL OR btrim(_invite_token) = '' OR _user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO inv
  FROM public.convites
  WHERE token = _invite_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT inv.is_active THEN
    RETURN false;
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.convite_utilizacoes
    WHERE invite_id = inv.id AND user_id = _user_id
  ) INTO already_used;

  IF NOT already_used AND inv.max_uses IS NOT NULL AND inv.uses_count >= inv.max_uses THEN
    RETURN false;
  END IF;

  FOREACH role_item IN ARRAY inv.roles LOOP
    IF role_item IS NOT NULL AND btrim(role_item) <> '' THEN
      INSERT INTO public.user_roles (user_id, role_name, assigned_by)
      VALUES (_user_id, role_item, COALESCE(_assigned_by, inv.created_by))
      ON CONFLICT DO NOTHING;
      IF role_item <> 'Formando' THEN
        has_non_formando := true;
      END IF;
    END IF;
  END LOOP;

  IF has_non_formando THEN
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role_name = 'Formando';
  END IF;

  IF NOT already_used THEN
    INSERT INTO public.convite_utilizacoes (invite_id, user_id)
    VALUES (inv.id, _user_id)
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS inserted_use = ROW_COUNT;

    IF inserted_use > 0 THEN
      UPDATE public.convites
      SET uses_count = uses_count + 1
      WHERE id = inv.id;
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_token text;
BEGIN
  INSERT INTO public.utilizadores (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    lower(NEW.email),
    'Formando'
  )
  ON CONFLICT (id) DO UPDATE SET email = COALESCE(public.utilizadores.email, EXCLUDED.email);

  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (NEW.id, 'Formando')
  ON CONFLICT DO NOTHING;

  invite_token := NULLIF(NEW.raw_user_meta_data->>'invite_token', '');
  IF invite_token IS NOT NULL THEN
    PERFORM public.apply_invite_to_user(invite_token, NEW.id, NULL);
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO public.convite_utilizacoes (invite_id, user_id, used_at)
SELECT c.id, ur.user_id, now()
FROM public.convites c
JOIN public.user_roles ur ON ur.role_name = ANY(c.roles)
ON CONFLICT DO NOTHING;