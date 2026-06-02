REVOKE ALL ON FUNCTION public.apply_invite_to_user(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_invite_to_user(text, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.apply_invite_to_user(text, uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invite_to_user(text, uuid, uuid) TO service_role;