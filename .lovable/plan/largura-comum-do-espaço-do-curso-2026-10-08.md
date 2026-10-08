# Largura comum do espaço do curso

- Unificar Visão geral, Formação, Caderno e barra num único contentor até 1440px, com espaçamento lateral definido no layout.
- Alargar a Visão geral, com lateral de 340px e percurso adaptado ao espaço realmente disponível.
- Manter os textos centrados com cerca de 760px de leitura; permitir maior largura a vídeo, PDF e quiz.
- Mostrar as entradas do Caderno em duas colunas a partir de 1024px, mantendo cada pergunta e resposta juntas. Não acrescentar índice lateral: reduziria o espaço útil das entradas.
- Preservar conteúdos, progressão, conclusão, badges e privacidade.
- Verificar as três vistas a 375, 768, 1024, 1280, 1440 e 1920px, com navegação lateral aberta e fechada, usando sessão autenticada se disponível.

## Detalhes técnicos
- Remover limites de largura das vistas; centralizar largura e espaçamento no layout partilhado.
- Usar consultas ao tamanho disponível para a grelha de módulos, evitando que a barra lateral da plataforma aperte os cartões.
- Preservar impressão do Caderno em coluna única.