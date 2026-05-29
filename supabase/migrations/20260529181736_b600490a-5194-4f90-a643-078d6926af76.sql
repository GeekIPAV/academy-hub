
-- Make badges granted via cluster (not required_program_id).
-- Drop the program-specific link and rewrite the auto-grant trigger to use the program's cluster_id.

ALTER TABLE public.badges DROP COLUMN IF EXISTS required_program_id;

CREATE OR REPLACE FUNCTION public.auto_grant_program_badge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cluster_id uuid;
  v_status_norm text;
BEGIN
  v_status_norm := lower(coalesce(NEW.status, ''));
  IF v_status_norm NOT IN ('concluido', 'concluído', 'certificado') THEN
    RETURN NEW;
  END IF;

  SELECT p.cluster_id INTO v_cluster_id
  FROM public.entidades_programas ep
  JOIN public.programas p ON p.id = ep.program_id
  WHERE ep.id = NEW.cohort_id;

  IF v_cluster_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_badges (user_id, badge_id)
  SELECT NEW.user_id, b.id
  FROM public.badges b
  WHERE b.cluster_id = v_cluster_id
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
