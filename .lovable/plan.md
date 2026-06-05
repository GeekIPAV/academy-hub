## Sistema de Biblioteca — Implementação

Implementar sistema completo de Biblioteca com área pública (consulta + sugestões) e administração (moderação + gestão de catálogo e categorias), seguindo o padrão do Centro de Recursos.

### 1. Base de Dados (migration)

**Bucket Storage:** `publicacoes` (público, para capas).

**Tabela `biblioteca_categorias`:**
- `id`, `name` (unique), `created_at`, `updated_at`
- RLS: leitura pública/auth; escrita só admin.
- Seed: `Inspiração`, `Livro`, `Artigo`, `Estudo`, `Vídeo`.

**Tabela `publicacoes`:**
- `id`, `title`, `author`, `summary`, `year`, `link`, `image_url`
- `status` ('pendente'|'aprovado'|'rejeitado', default 'pendente')
- `categoria_id` FK → `biblioteca_categorias`
- `is_ipav` BOOLEAN (default false)
- `proposed_by` UUID FK → `utilizadores(id)` nullable
- `created_at`, `updated_at`
- RLS:
  - `SELECT` para `authenticated` apenas onde `status = 'aprovado'`; admin vê tudo.
  - `INSERT` por `authenticated`: força `status='pendente'`, `proposed_by = auth.uid()`.
  - `UPDATE`/`DELETE`/insert aprovado direto: só admin.
- GRANTs apropriados a `authenticated` e `service_role`.
- Trigger `updated_at`.

### 2. Storage

Criar bucket `publicacoes` (público) via tool; policies de upload restritas a admin via RLS em `storage.objects`.

### 3. Server Functions (`src/lib/biblioteca.functions.ts`)

- `listPublicacoes({ tab: 'ipav'|'outras', categoriaId?, year?, search? })` — só aprovadas, ordena por title.
- `listCategorias()`.
- `proposePublicacao(input)` — auth user; status pendente.
- `listPendingPublicacoes()` — admin.
- `approvePublicacao(id)` / `rejectPublicacao(id)` — admin.
- `createOrUpdatePublicacao(input)` — admin; status='aprovado'.
- `deletePublicacao(id)` — admin.
- `createCategoria/updateCategoria/deleteCategoria` — admin.

Usar `requireSupabaseAuth` + verificação `is_admin` via `supabaseAdmin`/RPC para operações privilegiadas.

### 4. Frontend Público (`src/routes/publicacoes.tsx`)

Substitui página atual (que é só link). Componentes:
- `Tabs`: "Publicações IPAV" / "Outras Publicações" (filtra `is_ipav`).
- `FilterBar`: pesquisa, categoria (Select), ano (Select), toggle Lista/Galeria.
- Modo Galeria: grid de capas (aspect-[3/4] estilo livro).
- Modo Lista: linhas com thumbnail + meta + link.
- Botão "Sugerir Publicação" (só visível na aba "Outras") → `Dialog` com form: title*, author, year, summary, link, categoria*, upload de capa (CoverUploader inline). Submete via `proposePublicacao`.
- Mantém `RouteGate` + `ComponentAccessMatrix` (page path `/publicacoes`).

Manter páginas `publicacoes.biblioteca.tsx` e `publicacoes.ipav.tsx` redirecionando para `/publicacoes` (ou simplesmente deixar como existem; ajustar nav).

### 5. Frontend Admin (`src/routes/admin.biblioteca.tsx`)

`RouteGate path="/admin/biblioteca"` + verificação admin. 3 Tabs:

**Catálogo Geral:** `Collapsible` com formulário de criação (campos completos + upload capa) → cria com `status='aprovado'`. Tabela das aprovadas com edição inline (modal) e delete.

**Categorias:** Lista com criar/editar/eliminar.

**Propostas Pendentes:** Tabela com colunas (capa, título, autor, categoria, proposto por, data) e botões Aprovar (verde) / Rejeitar (vermelho).

### 6. Navegação

Adicionar em `src/lib/nav-config.ts`:
- "Gestão da Biblioteca" no grupo admin → `/admin/biblioteca`.

### 7. Notas técnicas

- Reutilizar `CoverUploader` (variant inline) com folder=`publicacoes` e id temporário (uuid) para uploads pré-criação.
- Usar `useQuery`/`useMutation` (TanStack Query) com invalidação após mutações.
- Validação Zod nas server functions.
- Toast (sonner) para feedback.

### Ordem de execução

1. Migration (tabelas + RLS + seed) e bucket
2. Server functions
3. Página pública + dialog de sugestão
4. Página admin com 3 tabs
5. Atualizar nav-config

Tudo respeita design tokens existentes (`bg-background`, `text-foreground`, etc.) e padrões visuais do Centro de Recursos.