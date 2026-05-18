
CREATE TABLE public.permissoes_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE CASCADE,
  resource_id text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('rota', 'componente')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_name, resource_id, tipo)
);

CREATE INDEX permissoes_roles_role_tipo_idx
  ON public.permissoes_roles (role_name, tipo);

ALTER TABLE public.permissoes_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view permissions"
ON public.permissoes_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert permissions"
ON public.permissoes_roles FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete permissions"
ON public.permissoes_roles FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Seed inicial — espelha MOCK_ROUTE_PERMISSIONS (apenas grants = true)
INSERT INTO public.permissoes_roles (role_name, resource_id, tipo) VALUES
  ('Admin', '/dashboard', 'rota'),
  ('Admin', '/actions', 'rota'),
  ('Admin', '/entidade/dashboard', 'rota'),
  ('Admin', '/admin/manager', 'rota'),
  ('Admin', '/admin/programas', 'rota'),
  ('Formador', '/dashboard', 'rota'),
  ('Formador', '/actions', 'rota'),
  ('Formando', '/dashboard', 'rota'),
  ('Formando', '/actions', 'rota'),
  ('Entidade', '/entidade/dashboard', 'rota')
ON CONFLICT DO NOTHING;
