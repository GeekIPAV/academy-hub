
-- Desativar trigger de proteção temporariamente para reconfigurar perfis de sistema
ALTER TABLE public.roles DISABLE TRIGGER USER;

INSERT INTO public.roles (name, description, is_system)
VALUES ('Participante', 'Perfil por defeito de quem se inscreve na plataforma sem convite', true)
ON CONFLICT (name) DO UPDATE SET is_system = true, description = EXCLUDED.description;

UPDATE public.roles SET is_system = false WHERE name IN ('Entidade','Formador','Formando');
UPDATE public.roles SET is_system = true WHERE name = 'Admin';

ALTER TABLE public.roles ENABLE TRIGGER USER;

-- handle_new_user → default 'Participante'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invite_token text;
BEGIN
  INSERT INTO public.utilizadores (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    lower(NEW.email),
    'Participante'
  )
  ON CONFLICT (id) DO UPDATE SET email = COALESCE(public.utilizadores.email, EXCLUDED.email);

  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (NEW.id, 'Participante')
  ON CONFLICT DO NOTHING;

  invite_token := NULLIF(NEW.raw_user_meta_data->>'invite_token', '');
  IF invite_token IS NOT NULL THEN
    PERFORM public.apply_invite_to_user(invite_token, NEW.id, NULL);
  END IF;

  RETURN NEW;
END;
$function$;

-- apply_invite_to_user → remove default 'Participante' quando o convite traz outra role
CREATE OR REPLACE FUNCTION public.apply_invite_to_user(_invite_token text, _user_id uuid, _assigned_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv record;
  already_used boolean := false;
  inserted_use integer := 0;
  role_item text;
  has_non_default boolean := false;
BEGIN
  IF _invite_token IS NULL OR btrim(_invite_token) = '' OR _user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO inv FROM public.convites WHERE token = _invite_token FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT inv.is_active THEN RETURN false; END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN RETURN false; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.convite_utilizacoes
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
      IF role_item <> 'Participante' THEN
        has_non_default := true;
      END IF;
    END IF;
  END LOOP;

  IF has_non_default THEN
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role_name = 'Participante';
  END IF;

  IF NOT already_used THEN
    INSERT INTO public.convite_utilizacoes (invite_id, user_id)
    VALUES (inv.id, _user_id)
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS inserted_use = ROW_COUNT;

    IF inserted_use > 0 THEN
      UPDATE public.convites SET uses_count = uses_count + 1 WHERE id = inv.id;
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$function$;
