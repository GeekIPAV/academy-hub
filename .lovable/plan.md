# Migrar os Programas do Notion para a plataforma

## O que vai mudar

**1. Programas ganham campos novos**
Estado ("Não começado", "Ativo", "Terminado", "Arquivado"), data de início, data de fim, certificação (sim/não), acreditação (sim/não) e email de contacto IPAV. O cluster passa a ser opcional. O campo "ativo" atual mantém-se sincronizado com o estado (Ativo = ativo).

**2. Catálogo de Produtos (novo)**
Lista partilhada por Programas e Ações, com nome, tipo ("Ação", "Evento" ou vazio), descrição e ordem. Fica preenchida com os 62 produtos reais indicados.

**3. Ligação Programa ↔ Produtos**
Cada programa pode ter vários produtos associados.

**4. Ações passam a usar o catálogo**
Em vez de escrever o produto à mão, escolhe-se da lista. O texto que já existir nas ações é convertido automaticamente para o produto correspondente (quando o nome coincide); nomes que não existam no catálogo são acrescentados ao catálogo para não se perder informação. Os filtros e cartões da galeria de Ações passam a usar o catálogo.

**5. Importação dos 41 programas**
Criados com título, estado, datas, certificação, acreditação, email de contacto e produtos ligados. Todos ficam sem cluster (a atribuir manualmente depois). Programas com o mesmo título já existentes são atualizados em vez de duplicados.

**6. Gestão completa na Central de Comando**
Em /admin/programas: criar, editar e apagar programas com todos os campos novos, incluindo seletor de vários produtos. Apagar é bloqueado quando o programa já tem entidades/inscrições associadas, com aviso claro. O cluster deixa de ser obrigatório ao criar.

## Notas técnicas

- Migração: novas colunas em `programas`; tabelas `produtos` (com `unique(name)`) e `programas_produtos` (PK composta); `acoes.produto_id` FK para `produtos` (mantendo `acoes.produto` durante a conversão e removendo o uso no código). GRANTs: SELECT a `authenticated` em `produtos`/`programas_produtos`, escrita apenas via `service_role` (server functions com verificação de admin); RLS ativa.
- `admin-programas.functions.ts`: `createPrograma`/`updateProgramaAdmin` alargadas (todos os campos + `produto_ids`), nova `deletePrograma` com verificação de dependências, `listProgramas` devolve os campos novos e produtos ligados, nova `listProdutos`.
- `admin-acoes-gestao.functions.ts` + `actions.functions.ts`: passam a ler/gravar `produto_id` e a devolver o nome do produto para a UI.
- UI: `AcaoDetailDrawer` com seletor de produto; `/acoes` filtra por produto do catálogo; `/admin/programas` com formulário completo por programa.
