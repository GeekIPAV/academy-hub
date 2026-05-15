## Objetivo

Ligar a tab **"Dados da Entidade"** (em `/entidade/dashboard`) à base de dados real, substituindo os dados mock por leitura/escrita na tabela `entidades`.

## 1. Alterações na base de dados

Adicionar colunas à tabela `entidades`:

- `contact_name` (texto) — nome do responsável
- `contact_email` (texto) — email de contacto
- `contact_phone` (texto) — telefone
- `address` (texto) — morada (rua/nº)
- `postal_code` (texto) — código postal (ex: "1000-001")
- `locality` (texto) — localidade

Adicionar coluna à tabela `utilizadores`:

- `entity_id` (uuid, nullable) — referencia `entidades.id`. Permite saber qual entidade um representante representa.

### Políticas RLS (tabela `entidades`)

- **SELECT** (já existe `Public can view notion entities` — manter).
- **UPDATE**: permitir se `is_admin(auth.uid())` **OU** se `id = (SELECT entity_id FROM utilizadores WHERE id = auth.uid())`.

## 2. Server function

Criar `src/lib/entidade.functions.ts` com:

- `getMyEntidade()` — protegida com `requireSupabaseAuth`. Lê `utilizadores.entity_id` do user logado e devolve a linha de `entidades` correspondente. Admins podem opcionalmente passar um `entity_id` explícito.
- `updateMyEntidade({ name, contact_name, contact_email, contact_phone, address, postal_code, locality })` — protegida com `requireSupabaseAuth`. Valida com Zod (lengths, formato de email, código postal `\d{4}-\d{3}`). Faz `UPDATE` em `entidades` filtrando pelo `entity_id` do user (ou pelo passado se admin). RLS é o backstop.

## 3. UI — `src/routes/entidade.dashboard.tsx`

Na função `EntityDataForm`:

- Substituir `useState` inicial com mocks por `useQuery(getMyEntidade)`.
- Acrescentar 3 inputs novos (Morada, Código Postal, Localidade) ao grid existente.
- Submit usa `useMutation(updateMyEntidade)` + `useServerFn`. Toast de sucesso/erro reais. Invalida a query no sucesso.
- Estados: loading skeleton enquanto carrega; mensagem se o user não tiver `entity_id` associado.

A tab "Visão Geral" (link de convite + tabela de formandos) **fica como está** (mock) — fora do âmbito desta tarefa.

## Detalhes técnicos

- Migration via `supabase--migration` (schema only).
- Não tocar em `src/integrations/supabase/types.ts` — regenera automaticamente.
- Não usar `supabaseAdmin`; usar o client autenticado via `requireSupabaseAuth` para que a RLS valide.
- Validação Zod server-side: `name` 1–200, `contact_email` `.email()` opcional, `postal_code` regex opcional, restantes strings opcionais com max 200.

## Ficheiros afetados

- **Migration nova** (adiciona colunas + política UPDATE)
- **Novo**: `src/lib/entidade.functions.ts`
- **Editado**: `src/routes/entidade.dashboard.tsx` (apenas `EntityDataForm`)
