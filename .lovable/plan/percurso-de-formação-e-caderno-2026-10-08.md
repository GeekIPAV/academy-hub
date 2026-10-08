# Percurso de formação e Caderno

## O que muda
- A entrada do E-learning apresenta primeiro o percurso do curso não concluído mais ativo, com seleção entre cursos inscritos. O catálogo fica abaixo; sem inscrições, mantém-se a entrada atual.
- Grelha com módulo atual em destaque, pergunta de fundo e Momentos; restantes módulos mostram conclusão, bloqueio ou «Em breve». No telemóvel, ficam recolhidos abaixo do atual.
- Opção «Progressão sequencial» editável na gestão, ativada no curso indicado. Cada momento exige a conclusão do anterior; cada módulo exige todos os momentos obrigatórios do anterior. Bloqueios aplicam-se às leituras, gravações e navegação, sem alterar badges ou certificados.
- Nota «Como funciona esta formação» com os textos fornecidos e sequência, junto do Caderno na Visão geral; acesso em painel no cabeçalho e aviso no primeiro momento.
- Caderno privado com reflexões agrupadas por módulo, respostas e datas, perguntas por responder e exportação através de página de impressão para guardar como PDF.

## Pressupostos
- Os conteúdos dos momentos não serão alterados. Apenas a apresentação do curso e a opção de progressão serão preenchidas.
- Pré-visualização da equipa conserva o acesso disponível atualmente; a progressão do formando é sempre validada no servidor.
- Reflexões submetidas contam como entradas; rascunhos não contam nem são exportados.

## Detalhes técnicos
- Acrescentar um campo booleano ao curso, com valor inicial desligado nos restantes cursos.
- Centralizar cálculo de bloqueios numa função pura partilhada e coberta por testes.
- Reutilizar respostas existentes em cursos_progresso; a função do Caderno deriva sempre o utilizador da sessão e não aceita identidade externa.
- Reutilizar componentes e tokens existentes, acrescentando tokens semânticos para as superfícies suaves e o Caderno.
- Verificar testes automáticos e, se houver sessão disponível, percurso, bloqueios, Caderno e impressão a 375px e 1280px.