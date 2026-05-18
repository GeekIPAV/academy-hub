# Replicar modelo Zite na Academia Ubuntu

Adapto os campos e relações da plataforma exportada às tabelas que já existem. Nada do que já temos é apagado — só acrescento colunas e uma tabela nova.

## 1. Alterações à base de dados

### `acoes` — colunas novas
- `start_date` (date), `end_date` (date) — mantenho `action_date` por retro-compatibilidade
- `created_by` (uuid, referência opcional ao utilizador)
- `tshirt_tracking_link` (text)
- `tshirt_value` (numeric)
- `fotos_link` (text)
- `avaliacao_satisfacao` (numeric 0–10) e `avaliacao_satisfacao_link` (text)
- `avaliacao_impacto` (numeric 0–10) e `avaliacao_impacto_link` (text)

### `inscritos_acoes` (formandos) — colunas novas
- `tshirt_size` (text: XS/S/M/L/XL/XXL)
- `certificate_sent` (boolean default false)
- `certificate_url` (text)
- `certificate_sent_at` (timestamptz)

### Nova tabela `formadores_acoes`
Liga formadores a ações (no Zite eram registos separados de participantes).
- `id`, `action_id` → acoes, `user_id` → utilizadores
- `tshirt_size` (text)
- `status` (text: 'Confirmado' | 'Pendente' | 'Cancelado')
- `certificate_sent` (bool), `certificate_url` (text), `certificate_sent_at` (timestamptz)
- `created_at`
- Unique (action_id, user_id)
- RLS: admin tudo; formador vê os seus próprios registos

### `entidades` — não precisa de alterações
Os campos do Zite (morada, código postal, localidade, telemóvel, email de contacto) já existem com nomes equivalentes. `idProgramaNotion` / `idEntidadeNotion` já existem via `entidades_programas`.

### Índices
- `idx_formadores_acoes_action`, `idx_formadores_acoes_user`
- `idx_inscritos_acoes_action` (se ainda não existir)

## 2. UI Admin

Acrescento à página `admin.programas.tsx` (ou crio `admin.acoes.tsx` se preferires) um painel por ação com 3 separadores:

### Tab "Detalhes & Logística"
- Datas (início/fim), link tracking t-shirts, valor t-shirts, link fotos
- Campos de avaliação (satisfação e impacto: nota + link de formulário)

### Tab "Formandos"
- Lista de inscritos da ação
- Edição inline: tamanho t-shirt, certificado enviado (toggle), URL do certificado
- Botão "Enviar certificado" (marca como enviado + guarda timestamp)

### Tab "Formadores"
- Lista de formadores associados à ação
- Adicionar formador (seleciona utilizador com role Formador/Admin)
- Mesma edição inline de t-shirt + certificado
- Remover formador

Componente partilhado `CertificateCell` para o padrão certificado em ambas as listas.

## 3. Sidebar
Acrescento entrada **"Ações (admin)"** debaixo de "Gestão de Programas" (só visível a admin).

## Detalhes técnicos
- Server functions novas em `src/lib/admin-acoes.functions.ts`:
  - `listActionDetails(actionId)` — devolve ação + formandos + formadores
  - `updateAction(actionId, fields)` — campos de logística/avaliação
  - `updateEnrollment(enrollmentId, fields)` — t-shirt + certificado do formando
  - `assignTrainer({ actionId, userId })` / `removeTrainer(id)` / `updateTrainer(id, fields)`
- Todas com `requireSupabaseAuth` + verificação `is_admin(userId)` no handler
- React Query com invalidações por `["action", id]`
- Não toco em `roles`, `permissoes_roles`, `user_roles`, `recursos`, `inscritos_programa`

## Fora do âmbito (Zite tinha mas não replico)
- Campo `password` em `entidades` — usamos auth do Supabase, não passwords em texto
- "Project" como string livre em entidades — já temos `entidades_programas` com FK

Confirma e avanço com a migração SQL.