# Refatoração: Tabela `clusters` + Validade de Badges

## 1. Migração SQL (uma só migration, transacional)

### 1.1 Criar tabela `clusters`
```sql
CREATE TABLE public.clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  cover_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clusters TO authenticated;
GRANT ALL ON public.clusters TO service_role;
ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view clusters" ON public.clusters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage clusters" ON public.clusters FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
```

### 1.2 Seed automático a partir de dados existentes
```sql
INSERT INTO public.clusters (name)
SELECT DISTINCT cluster FROM (
  SELECT cluster FROM programas WHERE cluster IS NOT NULL
  UNION SELECT cluster FROM temas_momentos WHERE cluster IS NOT NULL
  UNION SELECT cluster FROM badges WHERE cluster IS NOT NULL
) s
WHERE cluster <> ''
ON CONFLICT (name) DO NOTHING;
```
(Só existe 1 cluster real hoje: `Formação de Formadores - 3º Ciclo e Secundário`.)

### 1.3 FKs em cascade
- `programas.cluster_id uuid REFERENCES clusters(id) ON DELETE SET NULL` + backfill por `name`.
- `temas_momentos.cluster_id uuid REFERENCES clusters(id) ON DELETE CASCADE` + backfill.
- `badges`: adicionar `cluster_id`, backfill, depois `DROP COLUMN cluster` (substituição completa, com FK `ON DELETE CASCADE`).
- `recursos`: adicionar `cluster_id uuid REFERENCES clusters(id) ON DELETE SET NULL` (atualmente o cluster é inferido via `program_id` → backfill por esse caminho).

Mantenho as colunas `cluster` (text) em `programas` e `temas_momentos` por agora para evitar quebrar código durante o deploy; ficam deprecadas e podem ser removidas numa migration seguinte.

### 1.4 Validade temporal de badges
```sql
ALTER TABLE public.badges
  ADD COLUMN validity_type text NOT NULL DEFAULT 'forever'
    CHECK (validity_type IN ('forever','relative_years','fixed_date')),
  ADD COLUMN validity_years int,
  ADD COLUMN validity_fixed_date date;

ALTER TABLE public.user_badges
  ADD COLUMN expires_at timestamptz;
```
Trigger `compute_user_badge_expiry` (BEFORE INSERT em `user_badges`) preenche `expires_at` lendo `badges.validity_*`. Atualizar também `auto_grant_program_badge` para passar pelo trigger (já passa, basta o trigger correr).

## 2. Server functions

### 2.1 Novo `src/lib/clusters.functions.ts`
`listClusters`, `getCluster`, `createCluster`, `updateCluster` (inclui `cover_url`), `deleteCluster` — todos com `requireSupabaseAuth` + verificação de admin para mutations.

### 2.2 Atualizar existentes
- `src/lib/admin-programas.functions.ts`: ler/escrever `cluster_id`; nas listagens fazer join (`select('*, clusters(name)')`) e expor `cluster_name` no DTO.
- `src/lib/resources.functions.ts`: idem para `cluster_id` em `recursos`; filtros por cluster passam a usar id.
- `src/lib/badges.functions.ts`: trocar `cluster` por `cluster_id` em todas as queries/inputs; aceitar `validity_type/validity_years/validity_fixed_date` no create/update.

### 2.3 Hooks
- `src/hooks/use-badge-access.ts` e `use-badges.ts`: mudar a chave de comparação de string para `cluster_id`; aplicar filtro `expires_at IS NULL OR expires_at > now()` nas queries.

## 3. UI

### 3.1 `ClusterTemasManager.tsx`
- Carregar lista via `listClusters` (substitui strings/`cluster-utils`).
- Editor inline de clusters: criar/renomear/eliminar + `<CoverUploader>` gravando em `clusters.cover_url`.
- Formulários de Tema/Programa usam `<Select>` alimentado por `listClusters`, gravando `cluster_id`.

### 3.2 `src/routes/admin.badges.tsx`
- `<Select>` de cluster passa a usar `listClusters` → grava `cluster_id`.
- Novo bloco "Validade": radio `forever | relative_years | fixed_date` com inputs condicionais (`number` de anos / `date`).

### 3.3 Rotas de recursos (`recursos.$cluster.*`)
- Resolver o param de URL (continua a ser slug/name por legibilidade) para `cluster_id` no loader; gating com `useHasBadgeForCluster(cluster_id)`.

### 3.4 `entidade.dashboard.tsx`
- Filtro de tipo de ação usa `cluster_id` do programa associado.

## 4. Validação e migração de dados

- Backfill garantido por `UPDATE ... FROM clusters WHERE name = cluster` antes de qualquer `NOT NULL` ou `DROP COLUMN`.
- Apagar `badges.cluster` só **depois** de `cluster_id` estar populado em todas as linhas.
- Nenhum dado é perdido (`ON DELETE SET NULL` em programas/recursos protege contra remoções acidentais).

## 5. Detalhes técnicos relevantes

- Tipos TS são regenerados automaticamente após a migration; depois ajusto imports/usages em paralelo.
- `src/lib/cluster-utils.ts` deixa de exportar constantes hard-coded e passa a re-exportar helpers que usam o React Query cache de `listClusters` (mantém compatibilidade dos call-sites).
- Sem alteração ao broker de auth nem a `start.ts`.

## Ordem de execução
1. Migration SQL (criar tabela + seed + FKs + colunas de validade + trigger).
2. Regenerar types.
3. Criar `clusters.functions.ts` + hook `use-clusters.ts`.
4. Atualizar `badges.functions.ts`, `admin-programas.functions.ts`, `resources.functions.ts`, hooks de badges.
5. Refatorar `ClusterTemasManager`, `admin.badges`, rotas `recursos.$cluster.*`, `entidade.dashboard`.
6. Limpar `cluster-utils.ts`.
