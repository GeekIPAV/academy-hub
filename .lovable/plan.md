# Migrar Sidebar para Sistema Real de Roles

A sidebar ainda usa o sistema mock (`Simular Roles`, `A ver como`, `MOCK_PROFILE`, `MOCK_USER_ROLES`, `localStorage`). Após a Fase 2 cada utilizador tem um único role real persistido em `utilizadores.role`, pelo que a simulação multi-role deixou de fazer sentido.

## 1. Novo hook `src/hooks/use-current-profile.ts`

Lê o perfil do utilizador autenticado a partir da BD (RLS permite ler o próprio perfil):
- React Query (`queryKey: ["current-profile", userId]`).
- Faz `supabase.from("utilizadores").select("id, full_name, role").eq("id", userId).maybeSingle()` no browser client.
- Retorna `{ profile, role, isLoading }`.
- Invalidação automática no `onAuthStateChange` (já existe no root).

## 2. Simplificar `src/lib/app-context.tsx`

Remover por completo:
- `MOCK_PROFILE`, `MOCK_USER_ROLES`, `LS_ROLES`, função `load()`, `useState`/`useEffect` de hidratação.
- `setActiveRoles`, `assignedRoles` da API pública do contexto.

Nova forma:
- `AppProvider` usa `useCurrentProfile()` para obter o role real.
- `activeRoles = role ? [role] : []` (sempre 1 elemento, ou vazio se não autenticado).
- `isAdmin = role === "Admin"`.
- `canAccess`, `isComponentVisible`, `visibleRoutes` continuam idênticos mas baseados no role real.
- `profile` exposto vem do hook (ou `null` quando não autenticado).
- Enquanto `isLoading`, devolver children dentro de um estado neutro (sem rotas visíveis) — o `_authenticated` layout já redireciona não-autenticados para login.

## 3. Limpar `src/components/AppSidebar.tsx`

- Apagar bloco `Simular Roles (mock)` (linhas ~114-126).
- Apagar bloco `A ver como` Select (linhas ~129-150) — utilizador só tem 1 role.
- Apagar `toggleRole`, import de `Checkbox`, import de `Select*`, import de `ALL_ROLES`, import de `RoleName`.
- Footer mostra o role real do utilizador como único Badge (sem `.map`).
- `profile.full_name` vem do contexto real.

## 4. Limpar `src/lib/mock-data.ts`

Remover (se não houver outros consumidores):
- `MOCK_PROFILE`
- `MOCK_USER_ROLES`
- `MOCK_USER_ID`
- `ALL_ROLES` (substituído por `useRoles().activeRoleNames`)

Manter `APP_ROUTES` e `PAGE_COMPONENTS` (continuam a ser o registo canónico das rotas/componentes para a matriz de permissões).

## 5. Limpar `src/hooks/use-roles.ts`

Remover fallback `ALL_ROLES` — se a query estiver a carregar devolve `[]`; quem precisa de lista de roles deve esperar pelos dados reais (a matriz já trata isso via skeleton).

## 6. Verificação

- Build compila.
- Sidebar deixa de mostrar "Simular Roles" e "A ver como".
- Footer da sidebar mostra o role real (badge "Admin", "Formando", etc.) lido da BD.
- Mudar o role de um utilizador via `/admin/manager` e recarregar reflete o novo role na sidebar.
- Rotas visíveis correspondem às permissões reais persistidas em `permissoes_roles` para o role do utilizador.

## Notas

- Não tocar em `client.ts`, `client.server.ts`, `auth-middleware.ts`, `types.ts`.
- `RoleName` em `types.ts` já é `string` (Fase anterior), nada a alterar.
- Os 4 roles base continuam protegidos pelo trigger `protect_system_roles`.
