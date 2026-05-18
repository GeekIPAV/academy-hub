# Auditoria de Performance — Multi-Role & Permissões

Objetivo: reduzir queries redundantes, acelerar carregamento inicial e remover N+1 sem mexer na lógica de negócio.

## 1. Frontend — Cache agressivo (React Query)

Atualmente `usePermissions`, `useRoles` e `useCurrentProfile` usam `staleTime: 30_000`. Cada navegação volta a tocar no backend.

- `src/hooks/use-permissions.ts` → `staleTime: 5 * 60_000`, `gcTime: 30 * 60_000`, `refetchOnWindowFocus: false`. Mantém a invalidação no `onSettled` da mutation (toggle continua imediato).
- `src/hooks/use-roles.ts` → mesmos valores.
- `src/hooks/use-current-profile.ts` → mesmos valores. Mantém `enabled: !!userId`.
- `src/lib/app-context.tsx` → memoizar `canAccess` e `isComponentVisible` com `useCallback` (dependências: `activeRoles.join("|")`, `isAllowed`, `isAdmin`) para evitar re-renders em cascata nos consumidores.

Resultado: depois do primeiro fetch, navegar entre páginas não dispara mais nenhuma chamada de permissões/roles/perfil durante 5 min.

## 2. Backend — `listUsers` sem N+1 e mais leve

A função já não faz N+1 (faz 2 queries + merge em memória), mas pode ser simplificada para um único `select` embebido via PostgREST. Para isso é preciso a FK entre `user_roles.user_id` e `utilizadores.id` (hoje ausente).

- Migração: adicionar `FOREIGN KEY (user_id) REFERENCES utilizadores(id) ON DELETE CASCADE` em `user_roles`.
- `src/lib/users.functions.ts` → trocar as duas queries por:
  ```ts
  supabaseAdmin
    .from("utilizadores")
    .select("id, full_name, created_at, user_roles(role_name)")
    .order("created_at", { ascending: false });
  ```
  e mapear `roles = row.user_roles.map(r => r.role_name).sort()`.
- Manter o `auth.admin.listUsers` para emails (uma chamada). Limitar `perPage` ao mesmo valor.

## 3. Base de Dados — Índices + RLS

Migração única com:

```sql
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id        ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name      ON public.user_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_permissoes_roles_role     ON public.permissoes_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_permissoes_roles_lookup   ON public.permissoes_roles(role_name, resource_id, tipo);
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.utilizadores(id) ON DELETE CASCADE;
```

RLS / `is_admin()`:
- A função é `STABLE SECURITY DEFINER` e faz `EXISTS` em `user_roles`. Com os índices acima passa a ser O(1) e o planeador faz index scan, não sequential scan.
- **Não** vou migrar agora para `auth.jwt()` claims: exige um auth hook customizado + alterar todas as policies; o ganho real só aparece com muitos utilizadores e a base está praticamente vazia. Fica registado como otimização futura se a carga crescer.

## 4. Loading inicial (AppProvider)

`AppProvider` espera por permissões + perfil antes de renderizar conteúdo útil para o consumidor. Com `staleTime` agressivo, a partir da segunda navegação é instantâneo. Para o primeiro carregamento:
- Não bloqueia a UI: `canAccess` devolve `false` enquanto `permissions` está vazio, mas o `isAdmin` bypass garante que admins veem tudo logo que o perfil chega. Sem alterações de fluxo necessárias.

## Detalhes técnicos

- Ordem das migrações: índices + FK numa só migração para evitar 2 deploys.
- Tipos do Supabase serão regenerados após a migração (a relação embebida `user_roles(role_name)` só fica tipada depois disso). Até lá, `as any` mínimo no map se necessário.
- Sem alterações em rotas, RLS policies existentes, schemas Zod ou contratos das server functions (forma de retorno mantém-se).

## Ficheiros tocados

- `src/hooks/use-permissions.ts`
- `src/hooks/use-roles.ts`
- `src/hooks/use-current-profile.ts`
- `src/lib/app-context.tsx`
- `src/lib/users.functions.ts`
- nova migração SQL (índices + FK)

## Fora deste plano

- Migração de RLS para `auth.jwt()` (otimização futura).
- Alterações de UI ou lógica de impersonation.
