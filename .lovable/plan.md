## Objetivo
Adicionar, no `InviteLinksManager` da Central de Comando (`/admin/manager`), uma forma rápida de pré-visualizar a página pública de adesão (`/convite/$token`).

## Alterações

**`src/routes/admin.manager.tsx`** (componente `InviteLinksManager`)

Para cada convite listado, juntar ao lado dos botões existentes (Copiar / Revogar) um novo botão **"Abrir"** que abre `/convite/{token}` numa nova aba (`window.open(url, '_blank')`).

Isto permite testar/visualizar como ficará o formulário que os utilizadores convidados vão ver, sem precisar de colar o link no browser.

## Fora de âmbito
- Não mexer no `src/routes/convite.$token.tsx` (a página em si).
- Não mexer em lógica de backend nem em server functions.
- Não adicionar rotas dinâmicas ao seletor de rotas do Lovable (não é configurável).