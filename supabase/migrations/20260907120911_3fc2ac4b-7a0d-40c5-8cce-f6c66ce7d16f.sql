GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_equipa(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_cluster(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_recurso(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_update_timestamp() TO anon, authenticated;