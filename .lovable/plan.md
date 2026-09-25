# Integrar o leitor no espaço do curso

## Resultado
- Manter o cabeçalho e a barra lateral da plataforma visíveis em todas as páginas do E-learning.
- Transformar `/elearning/$cursoId` num layout persistente partilhado pela visão geral e pelo leitor, evitando que o cabeçalho do curso desapareça ou volte a carregar entre separadores.
- Preservar integralmente a lógica atual de progresso, conteúdos, quizzes, notas, badges e certificados.

## Implementação
1. **Layout global**
   - Remover a exceção de “modo foco” no layout principal.
   - Não alterar nem forçar o estado aberto/recolhido da barra lateral global.

2. **Layout partilhado do curso**
   - Criar a rota pai autenticada de `/elearning/$cursoId`, com carregamento único dos dados do curso e `<Outlet />` para as vistas filhas.
   - Adicionar um cabeçalho compacto e responsivo com capa, título, modalidade/turma, progresso e ação principal.
   - Adicionar navegação persistente “Visão geral” e “Formação”, com destaque da vista ativa.
   - Fazer “Formação” abrir o próximo passo por concluir ou o primeiro passo acessível; quando não houver inscrição, desativar com a ajuda “Inscreve-te para começar”, exceto na pré-visualização da equipa.

3. **Visão geral**
   - Manter descrição, turmas, badge, certificado e módulos existentes, removendo apenas o cabeçalho visual duplicado.
   - Manter os passos dos módulos clicáveis e direcionados para a vista Formação.
   - Coordenar a escolha de turma e a inscrição com a ação principal do cabeçalho sem alterar regras de negócio.

4. **Formação**
   - Remover o cabeçalho exclusivo do leitor e conservar “Passo X de Y”, Anterior/Seguinte e atalhos junto ao conteúdo.
   - Integrar o índice de módulos na largura da página: sticky e recolhível a partir de 1280px; gaveta e navegação inferior abaixo de 1280px.
   - Ajustar alturas e offsets ao cabeçalho global e ao cabeçalho/tabs do curso, sem sobreposição.
   - Preservar skeleton apenas no conteúdo ao trocar de passo, prefetch, quiz, vídeo, reflexão, materiais, notas e transições.

5. **Validação**
   - Validar visão geral e Formação a 375px, 1024px, 1280px e 1440px.
   - Em 1024px, 1280px e 1440px, testar a barra lateral global aberta e fechada.
   - Confirmar ausência de scroll horizontal, sobreposições e erros, e verificar navegação entre separadores e passos.

## Detalhes técnicos
- A nova rota pai será `src/routes/_authenticated/elearning.$cursoId.tsx`; a página atual permanece no leaf `elearning.$cursoId.index.tsx` e o leitor no leaf `elearning.$cursoId.passo.$passoId.tsx`.
- O cabeçalho partilhado reutilizará a query `['elearning', 'curso', cursoId]`; as invalidações atuais atualizarão progresso e certificado sem desmontar o layout.
- Se necessário, `getCurso` devolverá apenas um indicador de permissão de pré-visualização; não haverá alterações ao modelo de dados.
- O índice do leitor usará o breakpoint `xl` (1280px), deixando espaço para a navegação global nos ecrãs intermédios.
