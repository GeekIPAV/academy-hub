CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON public.user_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_permissoes_roles_role ON public.permissoes_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_permissoes_roles_lookup ON public.permissoes_roles(role_name, resource_id, tipo);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.utilizadores(id) ON DELETE CASCADE;
  END IF;
END $$;