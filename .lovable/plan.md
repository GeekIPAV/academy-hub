## Causa
A função `public.is_admin(uuid)` (usada nas RLS policies de `learning_resources` e `storage.objects` do bucket `resources`) não tem `EXECUTE` concedido aos roles `authenticated` e `anon`. Quando a policy tenta avaliar `is_admin(auth.uid())` durante o upload, a chamada falha com `permission denied for function is_admin`, e o Postgres trata a policy como falsa → erro "new row violates row-level security policy".

A conta `hello@seed-io.co` está corretamente marcada como `role='admin'` em `profiles` — o problema não é de dados, é de GRANTs.

## Correção (1 migração SQL)

```sql
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon, service_role;
```

Isto resolve simultaneamente:
- Upload para o bucket `resources` (storage.objects INSERT policy)
- INSERT/UPDATE/DELETE em `learning_resources`
- Qualquer outra policy futura que use `is_admin`

## Verificação pós-aplicação
1. Voltar a `/admin/recursos` e tentar carregar um PDF — deve aparecer "Recurso carregado com sucesso".
2. Confirmar que aparece na tabela "Recursos carregados".

## Fora de âmbito (não toco agora)
- Proteger a rota `/admin/recursos` para também verificar role admin no frontend (atualmente só exige autenticação) — posso fazer num passo seguinte se quiseres.