
GRANT SELECT ON public.badges TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view badges" ON public.badges;
CREATE POLICY "Authenticated can view badges"
ON public.badges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage badges" ON public.badges;
CREATE POLICY "Admins manage badges"
ON public.badges FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

GRANT SELECT ON public.user_badges TO authenticated;
GRANT INSERT, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own badges or admin views all" ON public.user_badges;
CREATE POLICY "Users view own badges or admin views all"
ON public.user_badges FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins assign badges" ON public.user_badges;
CREATE POLICY "Admins assign badges"
ON public.user_badges FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins revoke badges" ON public.user_badges;
CREATE POLICY "Admins revoke badges"
ON public.user_badges FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.auto_grant_program_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program_id uuid;
  v_status_norm text;
BEGIN
  v_status_norm := lower(coalesce(NEW.status, ''));
  IF v_status_norm NOT IN ('concluido', 'concluído', 'certificado') THEN
    RETURN NEW;
  END IF;

  SELECT ep.program_id INTO v_program_id
  FROM public.entidades_programas ep
  WHERE ep.id = NEW.cohort_id;

  IF v_program_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_badges (user_id, badge_id)
  SELECT NEW.user_id, b.id
  FROM public.badges b
  WHERE b.required_program_id = v_program_id
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_program_badge ON public.inscritos_programa;
CREATE TRIGGER trg_auto_grant_program_badge
AFTER INSERT OR UPDATE OF status ON public.inscritos_programa
FOR EACH ROW EXECUTE FUNCTION public.auto_grant_program_badge();
