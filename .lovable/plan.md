Adicionar ordenação por coluna e uma barra de pesquisa na tabela de utilizadores da página /admin/manager.

### O que vai ser alterado
- Ficheiro: `src/routes/admin.manager.tsx`
- Secção: `UsersManager` (tabela de utilizadores)

### Alterações
1. **Barra de pesquisa**
   - Adicionar um campo de input acima da tabela.
   - Filtrar os utilizadores por nome, email ou perfis de acesso (roles).
   - A pesquisa é case-insensitive e atualiza em tempo real.

2. **Ordenação por coluna**
   - Tornar os cabeçalhos das colunas clicáveis: Nome, Email, Perfis de Acesso, Ativo, Criado em.
   - Clicar uma vez ordena ascendente, clicar novamente ordena descendente, clicar uma terceira vez remove a ordenação.
   - Mostrar ícone visual (seta para cima/baixo) na coluna ativa.
   - Ordenação local sobre os dados já carregados.

### Resultado esperado
- A tabela de utilizadores passa a ter uma barra de pesquisa no topo.
- Cada coluna do cabeçalho permite ordenar os dados.
- A experiência mantém-se rápida e funciona com os dados já carregados pelo `useUsers`.