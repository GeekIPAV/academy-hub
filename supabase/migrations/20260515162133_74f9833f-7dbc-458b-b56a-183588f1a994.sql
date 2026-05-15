-- Rename tables
ALTER TABLE public.programs RENAME TO programas;
ALTER TABLE public.notion_entities RENAME TO entidades;
ALTER TABLE public.program_cohorts RENAME TO entidades_programas;
ALTER TABLE public.profiles RENAME TO utilizadores;
ALTER TABLE public.program_enrollments RENAME TO inscritos_programa;
ALTER TABLE public.training_actions RENAME TO acoes;
ALTER TABLE public.enrollments RENAME TO inscritos_acoes;
ALTER TABLE public.learning_resources RENAME TO recursos;
ALTER TABLE public.notifications RENAME TO notificacoes;
ALTER TABLE public.sync_logs RENAME TO registos_sincronizacao;
ALTER TABLE public.automation_logs RENAME TO registos_automacao;

-- Update functions that reference renamed tables
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.utilizadores WHERE id = _user_id AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.utilizadores (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_in_line(target_action_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT user_id 
  FROM public.inscritos_acoes 
  WHERE action_id = target_action_id 
    AND status = 'suplente'
  ORDER BY submitted_at ASC
  LIMIT 1;
$function$;