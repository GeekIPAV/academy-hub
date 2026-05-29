
CREATE TABLE public.paginas_conteudo (
  slug text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.paginas_conteudo TO anon;
GRANT SELECT, INSERT, UPDATE ON public.paginas_conteudo TO authenticated;
GRANT ALL ON public.paginas_conteudo TO service_role;

ALTER TABLE public.paginas_conteudo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page content"
  ON public.paginas_conteudo FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert page content"
  ON public.paginas_conteudo FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update page content"
  ON public.paginas_conteudo FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER set_paginas_conteudo_updated_at
  BEFORE UPDATE ON public.paginas_conteudo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.paginas_conteudo (slug, content) VALUES (
  'propriedade-intelectual',
  '{
    "title": "Metodologia Ubuntu, produtos e terminologia",
    "sections": [
      {
        "heading": "Regulamento",
        "body": "A metodologia Ubuntu e todos os produtos e terminologia através dela desenvolvidos, são propriedade do IPAV e estão protegidos por direitos de autor.\n\nA utilização da metodologia, no todo ou em parte, bem como de qualquer elemento, produto ou terminologia dela decorrentes, terá que ser expressamente autorizada pelo Direção do IPAV.\n\nQualquer utilização não autorizada merecerá, da parte do IPAV, todos os procedimentos legais, civis e criminais, considerados adequados para repor a justiça."
      },
      {
        "heading": "Condições e responsabilidade no uso de recurso pedagógicos",
        "body": "Os conteúdos pedagógicos disponibilizados durante os programas do IPAV apenas se destinam ao uso pedagógico e sob orientação do(s) formador(es) dos mesmos. Nesse contexto, para os efeitos legais aplicáveis, que não poderá ser dado uso público aos conteúdos disponibilizados nos programas, disseminar ou difundir os mesmos sem autorização explicíta por parte do IPAV, protegendo assim a identidade de cada interveniente, conforme Lei de Proteção de Dados (RGPD).",
        "italic": true
      }
    ]
  }'::jsonb
);
