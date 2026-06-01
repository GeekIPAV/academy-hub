## Objetivo
Na Central de Comando (`/admin/manager`), no painel **InviteLinksManager**, permitir que o Admin abra rapidamente a página pública de adesão (`/convite/$token`) para testar como ficará para o utilizador convidado.

## O que vai mudar

**`src/routes/admin.manager.tsx` — componente `InviteLinksManager`**

Para cada linha da tabela de convites ativos, adicionar um novo botão **"Abrir"** ao lado dos botões já existentes (Copiar / Revogar). Esse botão abre `/convite/{token}` numa **nova aba** do browser (`window.open(url, "_blank", "noopener")`).

Detalhes visuais:
- Botão `variant="outline"` com ícone `ExternalLink` (lucide-react), no mesmo estilo dos outros botões da linha.
- Ordem sugerida: **Abrir · Copiar · Revogar**.
- Sem alterações em tooltips, layout da tabela, ou comportamento de criação/revogação.

## Fora de âmbito
- Não mexer em `src/routes/convite.$token.tsx` (a página em si fica igual).
- Sem alterações em server functions ou base de dados.
- Sem nova entrada no seletor de rotas.

Confirmas para implementar?
