
-- Backfill email column for existing utilizadores from auth.users
UPDATE public.utilizadores u
SET email = lower(a.email)
FROM auth.users a
WHERE u.id = a.id
  AND a.email IS NOT NULL
  AND (u.email IS NULL OR u.email = '');

-- Update handle_new_user to also populate email going forward
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  RETURN NEW;
END;
$function$;
