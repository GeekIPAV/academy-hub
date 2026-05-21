# Centro de Recursos por Cluster

Reestrutura o Centro de Recursos para ser organizado por **Cluster** (atemporal, partilhado entre edições anuais) em vez de por programa ou por fase fixa (FTC/FTP/SU/SF).

## 1. Base de dados (migração)

Novas tabelas:

- `temas_momentos`
  - `id uuid pk`, `cluster text not null`, `title text not null`,
    `description text`, `context text`, `objectives text`,
    `order_index int not null default 0`,
    `created_at`, `updated_at`
  - Index em `(cluster, order_index)`
- `tema_recursos` (pivot M:N)
  - `tema_id uuid → temas_momentos(id) on delete cascade`
  - `recurso_id uuid → recursos(id) on delete cascade`
  - PK composta `(tema_id, recurso_id)`

RLS:
- `temas_momentos`: SELECT para `authenticated`; INSERT/UPDATE/DELETE só `is_admin(auth.uid())`.
- `tema_recursos`: mesmas regras.

Nota: a tabela `recursos` existente mantém-se. A coluna `phase` deixa de ser usada na nova UI (mantida para compatibilidade, sem migração destrutiva).

## 2. Visão Formando — `/recursos`

Substitui a UI atual baseada em fases por navegação por Cluster:

- Topo: seletor (Tabs ou Select) com os valores **únicos** de `programas.cluster` (filtrando nulos, ordenados alfabeticamente).
- Conteúdo: `Accordion` com os `temas_momentos` do cluster selecionado (ordenados por `order_index`).
  - Cada item mostra: título, descrição, contexto, objetivos.
  - Lista de recursos associados (via `tema_recursos`) em cards: título, descrição, botão "Abrir" com `target="_blank" rel="noopener noreferrer"` para `file_url` (proxy `/api/public/recursos/...` quando aplicável).
- Sem lógica de "desbloqueio por fase" — todos os formandos autenticados veem tudo do cluster.
- Manter `ComponentAccessMatrix` e `isComponentVisible` para o header/seletor/lista.

Fetch via TanStack Query numa única chamada:
```ts
supabase.from("temas_momentos")
  .select("*, tema_recursos(recursos(*))")
  .eq("cluster", cluster)
  .order("order_index");
```

## 3. Visão Admin — `/admin/recursos`

Reorganiza a página existente em três tabs:

1. **Biblioteca de Recursos** — CRUD da tabela `recursos` (título, descrição, tipo, upload de ficheiro para bucket `resources`). Reutiliza UI existente onde possível.
2. **Temas por Cluster** — Select de cluster → lista ordenável (drag handles simples com botões ↑/↓) de temas. Dialog para criar/editar (título, descrição, contexto, objetivos). Eliminar com confirmação.
3. **Associações** — Dentro de cada tema, multi-select (Checkbox list em Dialog) para escolher quais recursos da biblioteca estão ligados; grava em `tema_recursos`.

Mutations invalidam queries `['temas', cluster]` e `['recursos']`.

## 4. Ficheiros

**Novos**
- `src/lib/cluster-resources.functions.ts` — server fns: `listClusters`, `getTemasByCluster`, admin: `upsertTema`, `deleteTema`, `reorderTemas`, `setTemaRecursos`.
- `src/components/admin/TemasManager.tsx`
- `src/components/admin/RecursoAssociacoes.tsx`

**Editados**
- `src/routes/_authenticated/recursos.tsx` — nova UI por cluster.
- `src/routes/_authenticated/admin.recursos.tsx` — adiciona tabs com gestor de temas e associações.
- `src/integrations/supabase/types.ts` — regenerado automaticamente após migração.

## Notas técnicas

- `cluster` é text livre na tabela `programas`. Lista de clusters obtida com `select('cluster').not('cluster', 'is', null)` + dedupe no cliente.
- Server fns públicas (formando) usam `requireSupabaseAuth`; admin fns verificam role admin via `user_roles`/`utilizadores` como em `resources.functions.ts`.
- Manter compatibilidade com `phase` na tabela `recursos` (não remover coluna).
