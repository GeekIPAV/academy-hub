# Fase 2 — Atribuir Roles a Utilizadores Reais

Fechar o ciclo: normalizar valores existentes, ligar `utilizadores.role` à tabela `roles` via FK, e criar UI no centro de comando para o Admin atribuir perfis a utilizadores reais.

## 1. Migração de Base de Dados

**Normalização e FK** (ordem estrita numa única migração):

1. `UPDATE public.utilizadores SET role = initcap(role)` → converte `'admin'`→`'Admin'`, `'formando'`→`'Formando'`.
2. Atualizar `public.is_admin(_user_id)` para comparar `role = 'Admin'` (em vez de `'admin'`).
3. Atualizar `public.prevent_role_self_escalation()` para usar `'Admin'` na comparação.
4. Alterar default da coluna: `ALTER TABLE utilizadores ALTER COLUMN role SET DEFAULT 'Formando'`.
5. Atualizar `public.handle_new_user()` para inserir com role `'Formando'` (caso aplicável).
6. Adicionar FK: `ALTER TABLE utilizadores ADD CONSTRAINT utilizadores_role_fkey FOREIGN KEY (role) REFERENCES roles(name) ON UPDATE CASCADE ON DELETE RESTRICT`.
7. Adicionar policy RLS: "Admins update any profile" em `utilizadores` (UPDATE) com `is_admin(auth.uid())` — necessária para que o Admin possa mudar o role de outros.

## 2. Server Functions — `src/lib/users.functions.ts`

- `listUsers()` — middleware `requireSupabaseAuth` + `assertAdmin`. Usa `supabaseAdmin` para listar `id, full_name, role, created_at` + email via `auth.admin.listUsers()` (mapeado por id). Retorna DTO ordenado por `created_at desc`.
- `updateUserRole({ userId, role })` — Zod valida `userId` (uuid) e `role` (string). Verifica que role existe em `roles` e está `is_active`. Impede o admin de despromover-se a si próprio (`if userId === context.userId && role !== 'Admin' → erro`). Faz `update` via `supabaseAdmin`.

Atualizar `assertAdmin` em `roles.functions.ts`, `permissions.functions.ts` e `admin-programas.functions.ts` para comparar `'Admin'`.

## 3. Hook — `src/hooks/use-users.ts`

`useUsers()` com React Query: `listUsers` query + `updateUserRole` mutation com optimistic update e `invalidateQueries(['users'])`. Toasts de sucesso/erro.

## 4. UI — nova secção em `src/routes/admin.manager.tsx`

Componente `UsersManager` adicionado ao topo da página (ou acima de `RolesManager`):
- Card "Utilizadores" com Table: Nome, Email, Perfil de Acesso, Criado em.
- Coluna "Perfil de Acesso" é um `<Select>` populado por `useRoles().roles.filter(r => r.is_active)`. `onValueChange` → `updateUserRole.mutate`.
- Skeletons enquanto carrega; estado vazio amigável.
- Select desativado para o próprio utilizador autenticado (evita auto-despromoção, mensagem tooltip).

## 5. Verificação

- Build compila sem erros.
- Testar manualmente: criar role "Mentor", atribuí-lo a um utilizador, ver UI a atualizar instantaneamente, recarregar e confirmar persistência.
- Confirmar que após migração `is_admin()` continua a retornar `true` para o admin atual (role passa de `'admin'` para `'Admin'` no mesmo UPDATE que a função passa a comparar).

## Notas técnicas

- A ordem da migração é crítica: o UPDATE de valores tem de ser feito ANTES de adicionar a FK, e a função `is_admin` tem de ser atualizada na MESMA migração para evitar janela em que o admin perde permissões.
- `ON UPDATE CASCADE` na FK garante que renomear um role (se algum dia possível para roles não-system) propaga automaticamente.
- Não tocar em `client.ts`, `client.server.ts`, `auth-middleware.ts`, `types.ts` (auto-gerados).
