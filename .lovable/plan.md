# Redesenhar o leitor do E-learning

## Objetivo
Transformar o leitor num espaço de aprendizagem em ecrã inteiro, estável e responsivo, com navegação clara entre módulos e passos, preservando integralmente as regras atuais de conclusão, progresso, badges e certificados.

## Experiência do leitor
- Ativar um modo foco apenas em `/elearning/$cursoId/passo/$passoId`, escondendo o cabeçalho e a barra lateral globais sem afetar as restantes páginas.
- Criar um cabeçalho fixo de 56 px com controlo do índice, saída para o curso, título truncado, posição do passo, progresso e navegação compacta no desktop.
- Organizar o ecrã em índice de 320 px e conteúdo flexível; permitir recolher o índice e guardar essa preferência localmente com proteção contra falhas do navegador.
- Manter o cabeçalho e o índice montados durante a navegação; mostrar o estado de carregamento apenas na área do novo passo, levar o conteúdo ao topo, focar o título e preparar antecipadamente o passo seguinte.

## Índice de módulos
- Apresentar progresso geral e filtro “Mostrar só o que falta”.
- Usar módulos em acordeão com contagem, minutos em falta e estado de conclusão.
- Mostrar cada passo com estado, tipo, título, duração e destaque lateral do passo atual.
- Explicar passos bloqueados com o motivo correto, incluindo data de abertura, sequência ou falta de inscrição.
- Abrir o módulo atual e manter o passo atual visível automaticamente.

## Telemóvel e tablet
- Até 1023 px, transformar o índice numa gaveta de altura total com contexto do módulo e posição do passo.
- Criar navegação fixa inferior com áreas de toque de pelo menos 44 px e respeito pela área segura do dispositivo.
- Adaptar vídeo e PDF à largura e altura disponíveis, incluindo ação de ecrã inteiro para documentos.
- Garantir ausência de deslocação horizontal a 375 px, 768 px e 1280 px.

## Conteúdo e ações
- Adicionar contexto do módulo, tipo, duração e título acessível no topo.
- Aplicar largura de leitura até cerca de 720 px a texto, quiz e reflexão, e até cerca de 1000 px a vídeo e PDF.
- Criar uma barra de ação consistente no fundo para todos os tipos, fixa no desktop e integrada na barra inferior em ecrãs menores.
- Adicionar separadores “Sobre este passo”, “Materiais” e “As minhas notas”.
- Em “Materiais”, reunir o recurso do próprio passo e os recursos ligados ao tema do módulo, sem duplicados.

## Tipos de passo
- **Vídeo:** enquadramento 16:9, progresso visto, conclusão clara e passagem automática opcional ao passo seguinte após 5 segundos, com cancelamento.
- **Quiz:** uma pergunta de cada vez, progresso, navegação, revisão antes de submeter, atalhos 1–4 e Enter, resultado e revisão em acordeão, nova tentativa e continuação.
- **Reflexão:** enunciado destacado, editor confortável, contagem de palavras e hora do último rascunho guardado.
- **Texto:** tipografia de leitura com melhor ritmo para títulos, listas, imagens e parágrafos.
- **Recurso:** PDF amplo com abrir/descarregar/ecrã inteiro; outros formatos num cartão de recurso claro.
- Mostrar mensagens úteis para conteúdo em falta, vídeo inválido e acesso indisponível.

## Transições e atalhos
- Ao terminar o último passo de um módulo, mostrar um ecrã intermédio com resumo e ação para o módulo seguinte, incluindo a data quando ainda estiver fechado.
- Manter a celebração final do curso.
- Adicionar atalhos ←, →, M e um diálogo de ajuda acessível por “?”. Ignorar atalhos de navegação quando o foco estiver num campo de escrita.

## Notas pessoais
- Criar `cursos_notas` com utilizador, passo, texto e datas, com unicidade por utilizador e passo.
- Conceder acesso explícito apenas a utilizadores autenticados e serviço, ativar RLS e permitir a cada pessoa selecionar, criar, alterar e eliminar exclusivamente as próprias notas.
- Carregar a nota com o passo e guardá-la automaticamente com debounce, mostrando “A guardar…” e a hora da última gravação.

## Detalhes técnicos
- Reutilizar os componentes e tokens atuais, sem cores fora do design system.
- Enriquecer `getPasso` apenas com módulo atual, motivos de bloqueio, materiais do tema, nota pessoal e dados necessários ao resumo de módulo.
- Adicionar funções protegidas para guardar notas, validando o passo e o utilizador no servidor.
- Preservar sem alterações as funções de conclusão, vídeo, quiz, reflexão, emissão de badge e certificado.
- Assumir que “Sobre este passo” usa o texto de apoio já guardado no passo; nos passos de texto, o conteúdo principal continua a ser apresentado na área de leitura.

## Validação
- Criar temporariamente um curso com dois módulos e vários tipos de passo, testar navegação, índice, conclusão, quiz, reflexão, notas, PDF e transição de módulo.
- Validar no navegador a 375 px, 768 px e 1280 px, incluindo teclado, gaveta, recolha do índice, foco, scroll e ausência de overflow.
- Remover no fim todos os dados temporários e confirmar que o projeto fica sem erros.
