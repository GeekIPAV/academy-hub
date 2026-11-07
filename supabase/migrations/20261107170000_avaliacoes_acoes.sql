-- Sistema de avaliação das ações (satisfação / impacto), com respostas anónimas.
-- Todo o acesso passa por funções de servidor (service role); sem políticas
-- RLS para authenticated/anon, logo as tabelas não são legíveis diretamente.

-- 1. Modelos de questionário reutilizáveis (ponto de partida de cada avaliação)
CREATE TABLE IF NOT EXISTS public.avaliacao_modelos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('satisfacao', 'impacto', 'outro')),
  descricao text,
  perguntas jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS avaliacao_modelos_nome_key ON public.avaliacao_modelos (nome);

-- 2. Modelo sugerido por produto (relação preenchida manualmente)
CREATE TABLE IF NOT EXISTS public.avaliacao_modelos_produtos (
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (modelo_id, produto_id)
);

-- 3. Avaliações de uma ação (uma ação pode ter 0, 1 ou várias)
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acao_id uuid NOT NULL REFERENCES public.acoes(id) ON DELETE CASCADE,
  modelo_id uuid REFERENCES public.avaliacao_modelos(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('satisfacao', 'impacto', 'outro')),
  perguntas jsonb NOT NULL DEFAULT '[]'::jsonb,
  aberta boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS avaliacoes_acao_id_idx ON public.avaliacoes (acao_id);

-- 4. Respostas (anónimas: sem utilizador associado)
CREATE TABLE IF NOT EXISTS public.avaliacao_respostas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS avaliacao_respostas_avaliacao_idx
  ON public.avaliacao_respostas (avaliacao_id, created_at);

GRANT ALL ON public.avaliacao_modelos TO service_role;
GRANT ALL ON public.avaliacao_modelos_produtos TO service_role;
GRANT ALL ON public.avaliacoes TO service_role;
GRANT ALL ON public.avaliacao_respostas TO service_role;

ALTER TABLE public.avaliacao_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacao_modelos_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacao_respostas ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS avaliacao_modelos_set_updated_at ON public.avaliacao_modelos;
CREATE TRIGGER avaliacao_modelos_set_updated_at BEFORE UPDATE ON public.avaliacao_modelos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS avaliacoes_set_updated_at ON public.avaliacoes;
CREATE TRIGGER avaliacoes_set_updated_at BEFORE UPDATE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Modelos iniciais (a partir das folhas Excel existentes). Escala 0-10.
INSERT INTO public.avaliacao_modelos (nome, tipo, descricao, sort_order, perguntas) VALUES
(
  'Satisfação — Semana Ubuntu', 'satisfacao',
  'Avaliação geral de satisfação da Semana Ubuntu (0 a 10).', 1,
  $json$[
    {"id":"escola","tipo":"texto_curto","texto":"Agrupamento Escolar ou Escola","obrigatoria":true},
    {"id":"global","tipo":"escala","grupo":"Avaliação","texto":"Avaliação global da semana","obrigatoria":true},
    {"id":"utilidade","tipo":"escala","grupo":"Avaliação","texto":"Utilidade da formação Ubuntu para a vida pessoal","obrigatoria":true},
    {"id":"clareza","tipo":"escala","grupo":"Avaliação","texto":"Clareza dos objetivos e dos conteúdos","obrigatoria":true},
    {"id":"videos","tipo":"escala","grupo":"Avaliação","texto":"Vídeos e apresentações","obrigatoria":true},
    {"id":"dinamicas","tipo":"escala","grupo":"Avaliação","texto":"Dinâmicas e reflexões","obrigatoria":true},
    {"id":"espaco","tipo":"escala","grupo":"Avaliação","texto":"Espaço","obrigatoria":true},
    {"id":"filmes","tipo":"escala","grupo":"Avaliação","texto":"Filmes e reflexões","obrigatoria":true},
    {"id":"testemunhos","tipo":"escala","grupo":"Avaliação","texto":"Testemunhos Ubuntu","obrigatoria":true},
    {"id":"palavra","tipo":"texto_curto","texto":"Escolhe uma palavra que descreva o significado desta formação para ti.","obrigatoria":false},
    {"id":"aprendizagens","tipo":"texto_longo","texto":"Quais são as principais aprendizagens que retiras desta semana de formação no âmbito da Academia de Líderes Ubuntu?","obrigatoria":false},
    {"id":"comentarios","tipo":"texto_longo","texto":"Comentários e/ou sugestões","obrigatoria":false}
  ]$json$::jsonb
),
(
  'Impacto — Semana Ubuntu (geral)', 'impacto',
  'Antes e depois da formação, por pergunta (0 a 10).', 2,
  $json$[
    {"id":"filosofia","tipo":"escala_antes_depois","grupo":"Eu e o Ubuntu","texto":"Conheço a filosofia Ubuntu.","obrigatoria":true},
    {"id":"satisfeito","tipo":"escala_antes_depois","grupo":"Eu e o Ubuntu","texto":"Estou satisfeito/a por participar na Academia de Líderes Ubuntu.","obrigatoria":true},
    {"id":"conheco_me","tipo":"escala_antes_depois","grupo":"5 Pilares","texto":"Conheço-me bem.","obrigatoria":true},
    {"id":"talentos","tipo":"escala_antes_depois","grupo":"5 Pilares","texto":"Acredito nos meus talentos e qualidades.","obrigatoria":true},
    {"id":"resiliente","tipo":"escala_antes_depois","grupo":"5 Pilares","texto":"Vejo as dificuldades como oportunidades de crescimento. Sou resiliente.","obrigatoria":true},
    {"id":"empatico","tipo":"escala_antes_depois","grupo":"5 Pilares","texto":"Consigo colocar-me no lugar dos outros e sentir com eles. Sou empático/a.","obrigatoria":true},
    {"id":"servico","tipo":"escala_antes_depois","grupo":"5 Pilares","texto":"Tenho vontade de me colocar ao serviço dos outros.","obrigatoria":true},
    {"id":"responsavel","tipo":"escala_antes_depois","grupo":"Liderança pelo Exemplo","texto":"Sou responsável e sei assumir compromissos.","obrigatoria":true},
    {"id":"pontual","tipo":"escala_antes_depois","grupo":"Liderança pelo Exemplo","texto":"Sou pontual e assíduo/a.","obrigatoria":true},
    {"id":"testemunho","tipo":"escala_antes_depois","grupo":"Liderança pelo Exemplo","texto":"Dou importância ao testemunho pessoal.","obrigatoria":true},
    {"id":"esperanca","tipo":"escala_antes_depois","grupo":"Esperança","texto":"Olho para o futuro com esperança.","obrigatoria":true},
    {"id":"comentario","tipo":"texto_longo","texto":"Comentário","obrigatoria":false}
  ]$json$::jsonb
),
(
  'Impacto — Ubuntu Intercultural', 'impacto',
  'Competências para a interculturalidade, antes e depois (0 a 10).', 3,
  $json$[
    {"id":"visao_mundo","tipo":"escala_antes_depois","grupo":"Autoconsciência cultural e realidades construídas","texto":"Percebo que a forma como vejo o mundo é influenciada pelas minhas experiências.","obrigatoria":true},
    {"id":"outras_perspetivas","tipo":"escala_antes_depois","grupo":"Autoconsciência cultural e realidades construídas","texto":"Consigo perceber que outras pessoas podem ver a mesma situação de forma diferente da minha.","obrigatoria":true},
    {"id":"a_vontade","tipo":"escala_antes_depois","grupo":"Cultura e diversidade","texto":"Sinto-me à vontade a conviver com pessoas de culturas ou origens diferentes da minha.","obrigatoria":true},
    {"id":"em_comum","tipo":"escala_antes_depois","grupo":"Cultura e diversidade","texto":"Consigo encontrar coisas em comum com pessoas diferentes de mim.","obrigatoria":true},
    {"id":"diversidade","tipo":"escala_antes_depois","grupo":"Cultura e diversidade","texto":"A diversidade é algo positivo nos grupos e na minha escola.","obrigatoria":true},
    {"id":"nao_julgar","tipo":"escala_antes_depois","grupo":"Estereótipos, preconceitos e discriminação","texto":"Tento não julgar uma pessoa sem a conhecer bem.","obrigatoria":true},
    {"id":"reconheco_opinioes","tipo":"escala_antes_depois","grupo":"Estereótipos, preconceitos e discriminação","texto":"Reconheço quando formo opiniões sobre alguém ou um grupo sem os conhecer bem.","obrigatoria":true},
    {"id":"mudar_atitudes","tipo":"escala_antes_depois","grupo":"Estereótipos, preconceitos e discriminação","texto":"Estou disponível para refletir e mudar atitudes ou preconceitos quando os identifico.","obrigatoria":true},
    {"id":"comunicar","tipo":"escala_antes_depois","grupo":"Comunicação","texto":"Procuro compreender os outros e comunicar de forma clara, mesmo quando pensamos ou sentimos de maneiras diferentes.","obrigatoria":true},
    {"id":"atitudes_inclusao","tipo":"escala_antes_depois","grupo":"Ação / Responsabilidade","texto":"Acredito que as minhas atitudes podem contribuir para que todos se sintam incluídos.","obrigatoria":true},
    {"id":"agir_inclusao","tipo":"escala_antes_depois","grupo":"Ação / Responsabilidade","texto":"Estou disposto(a) a agir de forma a que todos se sintam incluídos e valorizados.","obrigatoria":true}
  ]$json$::jsonb
)
ON CONFLICT (nome) DO NOTHING;
