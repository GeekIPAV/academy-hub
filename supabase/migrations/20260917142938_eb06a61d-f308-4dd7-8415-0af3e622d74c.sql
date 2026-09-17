-- 1. Programas: novos campos
ALTER TABLE public.programas
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Não começado',
  ADD COLUMN IF NOT EXISTS date_start date,
  ADD COLUMN IF NOT EXISTS date_end date,
  ADD COLUMN IF NOT EXISTS certificacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acreditacao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_contacto_ipav text;

ALTER TABLE public.programas ALTER COLUMN cluster_id DROP NOT NULL;

-- 2. Catálogo de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  tipo text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS produtos_name_key ON public.produtos (name);

GRANT SELECT ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos_select_authenticated" ON public.produtos;
CREATE POLICY "produtos_select_authenticated" ON public.produtos
  FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS produtos_set_updated_at ON public.produtos;
CREATE TRIGGER produtos_set_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Ligação programa <-> produto
CREATE TABLE IF NOT EXISTS public.programas_produtos (
  program_id uuid NOT NULL REFERENCES public.programas(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, produto_id)
);

GRANT SELECT ON public.programas_produtos TO authenticated;
GRANT ALL ON public.programas_produtos TO service_role;
ALTER TABLE public.programas_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "programas_produtos_select_authenticated" ON public.programas_produtos;
CREATE POLICY "programas_produtos_select_authenticated" ON public.programas_produtos
  FOR SELECT TO authenticated USING (true);

-- 4. Ações: produto passa a referenciar o catálogo
ALTER TABLE public.acoes
  ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS acoes_produto_id_idx ON public.acoes (produto_id);
