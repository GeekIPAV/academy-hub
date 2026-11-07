-- Dá acesso ao widget "Próximos eventos" da página inicial aos mesmos papéis
-- que já veem o cabeçalho da página. Pode ser ajustado na Central de Comando.
INSERT INTO public.permissoes_roles (role_name, resource_id, tipo)
SELECT r.role_name, '/dashboard#proximos-eventos', 'componente'
FROM (
  SELECT DISTINCT role_name
  FROM public.permissoes_roles
  WHERE resource_id = '/dashboard#header' AND tipo = 'componente'
) r
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissoes_roles p
  WHERE p.role_name = r.role_name
    AND p.resource_id = '/dashboard#proximos-eventos'
    AND p.tipo = 'componente'
);
