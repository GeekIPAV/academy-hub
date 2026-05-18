# Criar novos roles na Central de Comando

Objetivo: na página `/admin/manager`, o Admin pode criar/editar/desativar roles (perfis) que ficam guardados na base de dados. As matrizes de permissões existentes (rotas + componentes) passam a usar dinamicamente a lista de roles vinda da BD, em vez do array hardcoded `ALL_ROLES`.

## 1. Base de dados (migração)

Nova tabela `public.roles`:
- `name` (text, único) — ex: "Admin", "Mentor"
- `description` (text, opcional)
- `is_system` (boolean) — true para os 4 roles base, impede apagar
- `is_active` (boolean, default true)
- standard id/created_at

RLS:
- SELECT: qualquer autenticado
- INSERT/UPDATE/DELETE: apenas `is_admin(auth.uid())`
- Trigger a impedir DELETE/rename quando `is_system = true`

Seed: inserir "Admin", "Formador", "Formando", "Entidade" com `is_system=true`.

(Não tocamos em `utilizadores.role` nesta fase — continua a ser texto livre; a única mudança é que o Admin vê e gere a lista canónica de roles.)

## 2. Server functions (`src/lib/roles.functions.ts`)

- `listRoles()` — leitura pública autenticada
- `createRole({ name, description })` — protegido, valida com zod (nome 2–40 chars, regex `^[A-Za-zÀ-ÿ0-9 _-]+$`, único)
- `updateRole({ id, description, is_active })` — protegido, bloqueia rename de system roles
- `deleteRole({ id })` — protegido, falha se `is_system`

Todas com `requireSupabaseAuth` + verificação `is_admin` no handler.

## 3. UI na Central de Comando

Novo bloco "Gestão de Roles" no topo de `/admin/manager`, antes da Matriz de Acessos:

- Tabela compacta: Nome · Descrição · Sistema (badge) · Ativo (switch) · ações (editar/eliminar)
- Botão "Novo Role" abre Dialog com formulário (nome + descrição), validação inline com zod + react-hook-form, toast de sucesso/erro
- Usa React Query (`useQuery` + `useMutation` com `invalidateQueries(['roles'])`)
- Skeleton em loading, empty state se só houver system roles

## 4. Integração com as matrizes existentes

- `ALL_ROLES` em `src/lib/mock-data.ts` deixa de ser fonte de verdade. Criar hook `useRoles()` que devolve `roles` ativos da BD (com fallback para os 4 system enquanto carrega).
- `AccessTab` (matriz de rotas) e `ComponentAccessMatrix` passam a iterar sobre `roles` dinâmicos em vez de `ALL_ROLES`.
- `RoutePermission`/`ComponentPermission` continuam em localStorage por agora (fora do âmbito); apenas a coluna de roles é dinâmica. Quando um role novo é criado, aparece automaticamente como nova coluna nas matrizes (sem permissões — Admin liga os switches).
- `RoleName` deixa de ser união literal e passa a `string` (alias) para acomodar roles custom; ajustar tipos onde necessário sem alargar o âmbito.

## 5. Validação

- Após migração: confirmar seed dos 4 roles em `psql`/read_query.
- Criar role "Mentor" pela UI → aparece como coluna nova nas duas matrizes.
- Tentar eliminar "Admin" → bloqueado com mensagem clara.
- Desativar role custom → some das matrizes, mantém-se na tabela de gestão.

## Fora do âmbito (confirmar se queres incluir depois)

- Atribuir roles a utilizadores reais (convites, mudar `utilizadores.role`).
- Persistir as próprias matrizes de permissão na BD (continuam em localStorage).
- Migrar `utilizadores.role` para FK para `roles.name`.
