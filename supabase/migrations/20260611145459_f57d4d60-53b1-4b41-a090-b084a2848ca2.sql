-- Make project_notion_id optional (legacy field, not used by the new enrollment flow)
ALTER TABLE public.entidades_programas
  ALTER COLUMN project_notion_id DROP NOT NULL,
  ALTER COLUMN project_notion_id SET DEFAULT NULL;

-- Ensure we never duplicate a cohort for the same (entity, program)
CREATE UNIQUE INDEX IF NOT EXISTS entidades_programas_entity_program_unique
  ON public.entidades_programas (entity_id, program_id)
  WHERE entity_id IS NOT NULL AND program_id IS NOT NULL;

-- Auto-provision cohort + invite_token whenever a new enrollment request is created,
-- or whenever an existing request is approved.
CREATE OR REPLACE FUNCTION public.auto_provision_entity_program_cohort()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approved_statuses text[] := ARRAY['pendente','aprovada','aprovado','aceite','ativa','ativo','confirmada'];
BEGIN
  IF NEW.entity_id IS NULL OR NEW.program_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS NULL OR NOT (lower(NEW.status) = ANY (approved_statuses)) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.entidades_programas (entity_id, program_id, is_active)
  VALUES (NEW.entity_id, NEW.program_id, true)
  ON CONFLICT (entity_id, program_id) WHERE entity_id IS NOT NULL AND program_id IS NOT NULL
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_provision_cohort_ins ON public.inscricoes_entidade_programa;
CREATE TRIGGER trg_auto_provision_cohort_ins
AFTER INSERT ON public.inscricoes_entidade_programa
FOR EACH ROW EXECUTE FUNCTION public.auto_provision_entity_program_cohort();

DROP TRIGGER IF EXISTS trg_auto_provision_cohort_upd ON public.inscricoes_entidade_programa;
CREATE TRIGGER trg_auto_provision_cohort_upd
AFTER UPDATE OF status ON public.inscricoes_entidade_programa
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.auto_provision_entity_program_cohort();

-- Backfill: create cohorts for every existing enrollment request that doesn't have one.
INSERT INTO public.entidades_programas (entity_id, program_id, is_active)
SELECT DISTINCT iep.entity_id, iep.program_id, true
FROM public.inscricoes_entidade_programa iep
WHERE iep.entity_id IS NOT NULL
  AND iep.program_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.entidades_programas ep
    WHERE ep.entity_id = iep.entity_id
      AND ep.program_id = iep.program_id
  );