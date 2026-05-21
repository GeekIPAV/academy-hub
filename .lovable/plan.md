# Reescrita de `admin/recursos`

## 1. Migração de base de dados

A tabela `recursos` tem hoje `phase text NOT NULL` (legado FTC/FTP/SU/SF). Como a nova Biblioteca deixa de gravar fase, esse insert falharia. Aplicar:

```sql
ALTER TABLE public.recursos ALTER COLUMN phase DROP NOT NULL;
```

`program_id` já é nullable e mantém-se assim. Não se mexe em RLS nem nas tabelas `temas_momentos` / `tema_recursos` (já existem com o schema previsto).

## 2. Reescrita de `src/routes/_authenticated/admin.recursos.tsx`

Apagar todo o conteúdo atual (Phase, program_id, bulk legado) e construir uma página única com `<Tabs>` shadcn e 3 separadores. Manter o `beforeLoad` que valida admin via `user_roles`.

### Tab 1 — "Biblioteca" (CRUD recursos puro)

- Card "Novo recurso" com formulário:
  - `Input` Título (obrigatório)
  - `Textarea` Descrição (opcional)
  - `Select` Tipo: `pdf` | `video`
  - `Input type="file"` (accept varia com o tipo)
  - Botão "Carregar recurso"
- Insert: `{ title, description, resource_type, file_url }` em `recursos`. `program_id` e `phase` ficam `NULL`. Upload para bucket `resources` em `biblioteca/<uuid>.<ext>`.
- Card "Recursos carregados": `Table` com colunas Título, Descrição, Tipo, Ações (Editar/Apagar).
- Dialog de edição: mesmos 4 campos; substituir ficheiro é opcional e, se substituído, apaga o antigo do storage.
- Apagar: remove linha + ficheiro do storage. `toast.success` / `toast.error` em todos os caminhos; `loading` por ação.
- Sem `Phase`, sem programa.

### Tab 2 — "Gestão de Temas"

- Topo: `Select` Cluster — valores únicos não-nulos de `programas.cluster` (`.not("cluster", "is", null)` + dedup + sort pt).
- Quando há cluster ativo:
  - Botão "Adicionar Tema" abre `Dialog` com `Input` Título, `Textarea` Descrição, `Textarea` Contexto, `Textarea` Objetivos.
  - Submit faz insert em `temas_momentos` com `{ cluster, title, description, context, objectives, order_index: maxOrder+1 }`. Edição faz update.
  - Lista (cards ou table) dos temas do cluster, ordenados por `order_index`, com botões Editar e Apagar (com confirm).
- Dados via TanStack Query (`['admin-temas', cluster]`), invalidados após mutações.

### Tab 3 — "Associações" (M:N)

- Topo: `Select` Cluster, depois `Select` Tema (temas do cluster).
- Quando há tema selecionado: lista vertical com `Checkbox` para cada recurso da Biblioteca (`recursos` ordenados por título).
- Estado inicial dos checkboxes = `tema_recursos` atuais do tema.
- Botão "Guardar Associações":
  1. `delete from tema_recursos where tema_id = X` (todos os registos antigos do tema).
  2. `insert` dos selecionados como `{ tema_id, recurso_id }`.
  3. Toast + invalidar query `['tema-recursos', tema_id]`.
- Mensagem clara quando não há recursos na Biblioteca ou temas no cluster.

## 3. Aspetos técnicos

- Imports shadcn: `Tabs, TabsList, TabsTrigger, TabsContent, Checkbox, Dialog…, Select…, Card…, Table…, Input, Textarea, Label, Button`.
- Tipos: declarar localmente `RecursoRow`, `TemaRow` e usar `from("temas_momentos" as never)` / `from("tema_recursos" as never)` (não constam em `types.ts`).
- `ClusterTemasManager.tsx` deixa de ser importado por esta rota (já existia mas tinha tudo num só componente); fica órfão no projeto — remover esse import e o ficheiro pode ser apagado num passo seguinte se preferires (não faz parte deste plano).
- Sem alterações ao `recursos.tsx` (visão formando) nem a outras rotas.

## Ficheiros tocados

- `supabase/migrations/<timestamp>_recursos_phase_nullable.sql` (novo).
- `src/routes/_authenticated/admin.recursos.tsx` (reescrito).
