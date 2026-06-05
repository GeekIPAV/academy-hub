
-- Revoke SELECT em colunas internas/sensíveis de acoes para o role authenticated.
-- service_role (usado por supabaseAdmin no servidor) mantém GRANT ALL e continua a ler tudo.
REVOKE SELECT (
  avaliacao_impacto,
  avaliacao_impacto_link,
  avaliacao_satisfacao,
  avaliacao_satisfacao_link,
  fotos_link,
  tshirt_tracking_link,
  tshirt_value
) ON public.acoes FROM authenticated;
