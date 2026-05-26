
REVOKE EXECUTE ON FUNCTION public.anonimizar_utilizador(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_primary_role() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_system_roles() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_escalation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.list_utilizadores_columns() FROM authenticated;
