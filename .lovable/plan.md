## Diagnóstico

O dashboard `/entidade/dashboard` está vazio porque as 3 server functions (`getMyEntidade`, `listMyCohorts`, `listMyTrainees`) filtram tudo por `utilizadores.entity_id` do user logado. O teu user (`hello@seed-io.co`, role `admin`) tem `entity_id = NULL` → todas devolvem `null`/`[]`.

## Plano: admin pode escolher entidade

### 1. `src/lib/entidade.functions.ts`
- Adicionar nova fn `listAllEntidades` (admin-only, via `is_admin` check + `supabaseAdmin`) que devolve `{ id, name }[]` de todas as entidades. Bloqueia se não for admin.
- Aceitar `entityId?: string` opcional como input em `getMyEntidade`, `listMyCohorts`, `listMyTrainees`, `updateMyEntidade`:
  - Se for **admin** e `entityId` vier → usa esse.
  - Caso contrário → mantém a lógica atual (lê `utilizadores.entity_id`).
  - Validação Zod do uuid quando presente.

### 2. `src/routes/entidade.dashboard.tsx`
- No topo, se `isAdmin`, renderizar um **Select de entidade** (shadcn `Select`) povoado por `listAllEntidades`. Estado `selectedEntityId` guardado em `useState` (default = primeira entidade da lista, ou a do user se tiver).
- Passar `selectedEntityId` como `data` para todos os `useQuery` e mutações; incluir no `queryKey` para refetch quando mudar.
- Para users não-admin nada muda (não vêem o seletor; queries usam o seu próprio `entity_id`).

### 3. Sem migração de schema
Tudo resolvido em código + ACL no servidor. RLS de `entidades` UPDATE já permite admin via `is_admin(auth.uid())`, portanto admins continuam a poder gravar.

## Resultado esperado
Como admin, abres `/entidade/dashboard`, escolhes "IPAV" no seletor, e vês imediatamente o invite link do programa "F.F - 3º ciclo e Secundário_25-26" (que já criei) + a tabela de formandos (vazia até alguém se inscrever pelo link).
