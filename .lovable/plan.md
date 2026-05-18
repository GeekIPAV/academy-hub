## Objetivo
Permitir que cada utilizador acumule vários perfis (ex.: "Admin" + "Formador"), em vez de estar limitado a um único role na coluna `utilizadores.role`.

## Fase 1 — Base de Dados

Criar tabela de junção `user_roles`:

- `user_id uuid` → `utilizadores(id)` ON DELETE CASCADE
- `role_name text` → `roles(name)` ON UPDATE CASCADE ON DELETE RESTRICT
- PK composta `(user_id, role_name)`
- `created_at`, `assigned_by uuid`

RLS:
- `SELECT`: utilizador vê os seus próprios; Admin vê todos
- `INSERT`/`DELETE`: apenas Admin (`is_admin(auth.uid())`)

Backfill: para cada linha em `utilizadores` com `role` não nulo, inserir `(id, role)` em `user_roles`.

Funções:
- `has_role(_user uuid, _role text) RETURNS boolean` — SECURITY DEFINER, lê de `user_roles`
- Reescrever `is_admin(_user uuid)` para usar `has_role(_user, 'Admin')`
- `handle_new_user`: continua a popular `utilizadores`, mas também faz `INSERT INTO user_roles (id, 'Formando')`

Manter a coluna `utilizadores.role` por agora como "perfil primário" (para evitar quebrar tudo), sincronizada via trigger: quando `user_roles` muda, atualiza `utilizadores.role` para o primeiro role do utilizador (ou null). Isto mantém código legacy a funcionar; numa fase futura pode ser removida.

Alternativa mais limpa: remover `utilizadores.role` já. **Proposta:** manter por compatibilidade, marcar como deprecated.

## Fase 2 — Server functions

`src/lib/users.functions.ts`:
- `listUsers()` devolve `roles: string[]` por utilizador (join com `user_roles`)
- Remover `updateUserRole` (single role)
- Adicionar:
  - `assignRole({ userId, role })` — Admin only
  - `removeRole({ userId, role })` — Admin only, com proteção: um Admin não se pode despromover a si próprio se for o último Admin do sistema

## Fase 3 — Frontend

- `useCurrentProfile`: devolver `roles: string[]` (lê `user_roles`), manter `role` como `roles[0]` para compatibilidade
- `app-context.tsx`: `activeRoles` passa a ser os roles reais (já é array), `isAdmin = roles.includes("Admin")`. Impersonation continua a permitir simular **um** role para preview
- `admin.manager.tsx` (secção Utilizadores): substituir `<Select>` único por um conjunto de checkboxes/badges com toggle por role ativo. Cada toggle chama `assignRole` ou `removeRole` com optimistic update

## Verificação
Build limpo, `useRoles` continua a alimentar dropdowns, Admin pode atribuir múltiplos perfis a um utilizador, sidebar mostra todos os badges, permissões resolvem-se como união dos roles do utilizador.
