ALTER TABLE public.cursos ADD COLUMN IF NOT EXISTS apresentacao jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.cursos_modulos ADD COLUMN IF NOT EXISTS pergunta_fundo text;
UPDATE public.cursos SET apresentacao = '{
 "percurso":[
  {"titulo":"Encontro inicial","descricao":"Conhecer a equipa ALU, o percurso e a primeira pergunta Ubuntu.","estado":"concluido"},
  {"titulo":"Formação assíncrona","descricao":"Cinco módulos na plataforma, ao seu ritmo.","estado":"atual"},
  {"titulo":"Encontro de integração","descricao":"Momento humano para partilhar o Caderno de Percurso.","estado":"seguinte"},
  {"titulo":"Semana Ubuntu","descricao":"A experiência vivida com os alunos na escola.","estado":"aplicacao"}],
 "como_funciona":[
  {"titulo":"Parar e refletir","descricao":"Perguntas pessoais. Não há certo nem errado. Ficam no seu Caderno e não são avaliadas."},
  {"titulo":"Verificar o que compreendi","descricao":"Questões curtas sobre conceitos, com explicação automática depois de responder."},
  {"titulo":"Pensar como Educador/a Ubuntu","descricao":"Casos pedagógicos. Responde primeiro, depois lê a leitura da ALU."}],
 "sequencia":["Conteúdo","Parar e refletir","Caso","Verificação","Síntese"]
}'::jsonb WHERE title LIKE 'Formação Teórico-Conceptual Assíncrona%';
UPDATE public.cursos_modulos m SET pergunta_fundo = 'O que muda na educação quando partimos de uma visão relacional da pessoa?'
FROM public.cursos c WHERE m.curso_id = c.id AND c.title LIKE 'Formação Teórico-Conceptual Assíncrona%' AND m.sort_order = 0;