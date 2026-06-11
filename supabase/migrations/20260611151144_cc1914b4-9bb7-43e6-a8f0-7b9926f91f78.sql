
-- 1) Restrict write access on projetos to admins; keep authenticated read
DROP POLICY IF EXISTS "Admins têm controlo total sobre projetos" ON public.projetos;
CREATE POLICY "Admins insert projetos" ON public.projetos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update projetos" ON public.projetos
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete projetos" ON public.projetos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 2) Restrict write access on entidades_projetos to admins; keep authenticated read
DROP POLICY IF EXISTS "Admins têm controlo total sobre alocações" ON public.entidades_projetos;
CREATE POLICY "Admins insert alocacoes" ON public.entidades_projetos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update alocacoes" ON public.entidades_projetos
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete alocacoes" ON public.entidades_projetos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 3) Allow entity representatives to read their own cohort rows
CREATE POLICY "Entity reps view own cohorts" ON public.entidades_programas
  FOR SELECT TO authenticated
  USING (entity_id IN (SELECT u.entity_id FROM public.utilizadores u WHERE u.id = auth.uid() AND u.entity_id IS NOT NULL));

-- 4) Storage SELECT policy for resources bucket
CREATE POLICY "Authorized users can read resource files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'resources'
    AND EXISTS (
      SELECT 1 FROM public.recursos r
      WHERE r.file_url LIKE '%' || storage.objects.name
        AND public.user_can_access_recurso(auth.uid(), r.id)
    )
  );

-- 5) Set search_path on the remaining mutable function
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6) Revoke anon EXECUTE on the trigger function (intended for trigger use only)
REVOKE EXECUTE ON FUNCTION public.auto_provision_entity_program_cohort() FROM anon, PUBLIC;
