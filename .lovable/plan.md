## Objetivo

Criar `/admin/emails` onde admins escolhem um template de email (auth ou app) numa dropdown com pesquisa, editam o **assunto** e o **corpo** num editor rich-text com chips de variáveis, e guardam. Os emails passam a ser enviados com o conteúdo guardado em base de dados, com fallback para o template por defeito.

## Pré-requisito: domínio de envio

Antes de o sistema poder enviar emails customizados, é preciso configurar o domínio (ex: `notify.ipav.pt` ou `mail.ipav.pt`) — `app.ipav.pt` é o domínio da app, não serve diretamente como subdomínio de envio delegado.

```text
<presentation-actions>
<presentation-open-email-setup>Configurar domínio de email</presentation-open-email-setup>
</presentation-actions>
```

Quando confirmares, eu corro o setup da infraestrutura de emails e faço scaffold dos templates auth + app, e só depois construo a UI admin.

## Modelo de dados

Nova tabela `email_templates_custom`:
- `template_key` (PK, ex: `auth.recovery`, `app.inscricao-confirmada`)
- `kind` (`auth` | `app`)
- `subject` (text)
- `body_html` (text — HTML gerado pelo editor)
- `variables` (jsonb — lista de `{key, label}` disponíveis, ex: `[{key:"nome",label:"Nome"}]`)
- `updated_by`, timestamps

RLS: SELECT/UPDATE só admin. Render de email lê via `supabaseAdmin`.

## Templates registados (catálogo)

Ficheiro `src/lib/email-templates/catalog.ts` — fonte de verdade dos templates editáveis, suas variáveis e o subject/body por defeito:

- **Auth (6)**: signup, magic-link, recovery, invite, email-change, reauthentication
- **App (inicial)**: inscricao-confirmada, inscricao-suplente, certificado-emitido, convite-entidade

Cada entrada do catálogo declara `{ key, kind, displayName, defaultSubject, defaultBodyHtml, variables[] }`.

## Página admin — `/admin/emails`

UI (uma única coluna, padrão das outras páginas admin):
1. **Combobox searchable** (shadcn `Command` + `Popover`) agrupada por secção "Autenticação" / "Aplicação", a mostrar `displayName` e descrição curta.
2. Ao escolher → carrega valores guardados (ou defaults se ainda não customizado), mostra:
   - Input `Assunto`
   - Barra de chips com as **variáveis disponíveis** desse template (clique insere `{{nome}}` no editor/assunto onde estiver o cursor)
   - `RichTextEditor` (reutilizar `src/components/rich-text-editor.tsx`) para o corpo
   - Preview lateral/inferior renderizado (substitui variáveis por valores de exemplo)
3. Botões: **Guardar**, **Restaurar default**, **Enviar email de teste para mim**
4. Aviso se o domínio de envio ainda não estiver verificado.

## Server functions (`src/lib/admin-emails.functions.ts`)

Todas com `requireSupabaseAuth` + check `is_admin`:
- `listEmailTemplates()` → catálogo + flag `customized`
- `getEmailTemplate(key)` → custom merged com default
- `saveEmailTemplate({key, subject, body_html})` → validação Zod (subject ≤200, body ≤50k, variáveis usadas têm de pertencer ao catálogo)
- `resetEmailTemplate(key)` → apaga linha custom
- `sendTestEmail(key)` → envia para o email do admin com dados de exemplo

## Integração no envio

- **App emails**: a rota `/lovable/email/transactional/send` (scaffolded) passa por um helper que, antes de renderizar o template React, consulta `email_templates_custom` por `key`. Se existir, substitui subject + render por HTML guardado com interpolação `{{var}}`. Caso contrário usa o React component default.
- **Auth emails**: a edge function `auth-email-hook` (scaffolded) faz a mesma lookup por `auth.<action>` antes de enfileirar.

## Rota e navegação

- Adicionar `src/routes/admin.emails.tsx`
- Adicionar item "Gestão de Emails" (icon `Mail`) no grupo Admin em `src/lib/nav-config.ts`

## Ordem de execução (após aprovação)

1. Setup do domínio de email (interação tua na dialog).
2. `setup_email_infra` + scaffold auth + scaffold app emails.
3. Migration para `email_templates_custom` + catálogo + nav item.
4. Server functions + página admin `/admin/emails`.
5. Hook de lookup no render dos templates (auth + app).
6. Testar com "Enviar email de teste".

Confirmas o domínio que queres usar (ex: `notify.ipav.pt`) para eu avançar?
