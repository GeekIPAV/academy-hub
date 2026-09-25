CREATE OR REPLACE FUNCTION public.elearning_enroll_admins_on_curso()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.cursos_inscricoes (user_id, curso_id, estado)
  SELECT DISTINCT ur.user_id, NEW.id, 'inscrito' FROM public.user_roles ur
  WHERE ur.role_name = 'Admin'
    AND NOT EXISTS (SELECT 1 FROM public.cursos_inscricoes i WHERE i.user_id = ur.user_id AND i.curso_id = NEW.id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.elearning_enroll_admin_on_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role_name = 'Admin' THEN
    INSERT INTO public.cursos_inscricoes (user_id, curso_id, estado)
    SELECT NEW.user_id, c.id, 'inscrito' FROM public.cursos c
    WHERE NOT EXISTS (SELECT 1 FROM public.cursos_inscricoes i WHERE i.user_id = NEW.user_id AND i.curso_id = c.id);
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.elearning_enroll_admins_on_curso() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.elearning_enroll_admin_on_role() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_elearning_enroll_admins AFTER INSERT ON public.cursos
FOR EACH ROW EXECUTE FUNCTION public.elearning_enroll_admins_on_curso();
CREATE TRIGGER trg_elearning_enroll_admin_role AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.elearning_enroll_admin_on_role();

INSERT INTO public.cursos_inscricoes (user_id, curso_id, estado)
SELECT DISTINCT ur.user_id, c.id, 'inscrito' FROM public.user_roles ur CROSS JOIN public.cursos c
WHERE ur.role_name = 'Admin'
  AND NOT EXISTS (SELECT 1 FROM public.cursos_inscricoes i WHERE i.user_id = ur.user_id AND i.curso_id = c.id);