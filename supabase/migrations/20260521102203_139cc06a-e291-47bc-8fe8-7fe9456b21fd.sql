
-- Tabela de temas/momentos pedagógicos por cluster (atemporal)
CREATE TABLE public.temas_momentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster text NOT NULL,
  title text NOT NULL,
  description text,
  context text,
  objectives text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_temas_momentos_cluster_order ON public.temas_momentos(cluster, order_index);

ALTER TABLE public.temas_momentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view temas"
  ON public.temas_momentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage temas"
  ON public.temas_momentos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Tabela pivot tema <-> recurso
CREATE TABLE public.tema_recursos (
  tema_id uuid NOT NULL REFERENCES public.temas_momentos(id) ON DELETE CASCADE,
  recurso_id uuid NOT NULL REFERENCES public.recursos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tema_id, recurso_id)
);

CREATE INDEX idx_tema_recursos_recurso ON public.tema_recursos(recurso_id);

ALTER TABLE public.tema_recursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tema_recursos"
  ON public.tema_recursos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage tema_recursos"
  ON public.tema_recursos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger updated_at em temas_momentos
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_temas_momentos_updated_at
  BEFORE UPDATE ON public.temas_momentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
