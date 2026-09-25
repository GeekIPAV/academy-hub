CREATE OR REPLACE FUNCTION public.elearning_enroll_admins_on_curso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.cursos_inscricoes (user_id, curso_id, estado)
  SELECT DISTINCT ur.user_id, NEW.id, 'inscrito'
  FROM public.user_roles ur
  WHERE ur.role_name IN ('Admin', 'Equipa IPAV')
    AND NOT EXISTS (
      SELECT 1
      FROM public.cursos_inscricoes i
      WHERE i.user_id = ur.user_id
        AND i.curso_id = NEW.id
    );
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.elearning_enroll_admin_on_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role_name IN ('Admin', 'Equipa IPAV') THEN
    INSERT INTO public.cursos_inscricoes (user_id, curso_id, estado)
    SELECT NEW.user_id, c.id, 'inscrito'
    FROM public.cursos c
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.cursos_inscricoes i
      WHERE i.user_id = NEW.user_id
        AND i.curso_id = c.id
    );
  END IF;
  RETURN NEW;
END
$function$;