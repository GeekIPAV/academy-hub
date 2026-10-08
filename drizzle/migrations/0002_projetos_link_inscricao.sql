ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS inscricao_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(9), 'hex');
UPDATE public.projetos SET inscricao_token = encode(extensions.gen_random_bytes(9), 'hex') WHERE inscricao_token IS NULL;

CREATE OR REPLACE FUNCTION public.user_projetos_efetivos(_user_id uuid)
 RETURNS TABLE(project_id uuid, origem text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT up.project_id, 'direto'::text FROM public.utilizadores_projetos up WHERE up.user_id = _user_id
  UNION
  SELECT ep.project_id, 'entidade'::text
  FROM public.utilizadores u
  JOIN public.entidades_projetos ep ON ep.entity_id = u.entity_id
  WHERE u.id = _user_id AND ep.is_active
    AND ep.data_inicio <= now() AND (ep.data_fim IS NULL OR ep.data_fim > now())
  UNION
  SELECT ep.project_id, 'entidade'::text
  FROM public.inscritos_programa ip
  JOIN public.entidades_programas c ON c.id = ip.cohort_id
  JOIN public.entidades_projetos ep ON ep.entity_id = c.entity_id
  WHERE ip.user_id = _user_id AND ip.status IN ('aprovada','concluido','lista_espera')
    AND ep.is_active AND ep.data_inicio <= now() AND (ep.data_fim IS NULL OR ep.data_fim > now())
$function$;