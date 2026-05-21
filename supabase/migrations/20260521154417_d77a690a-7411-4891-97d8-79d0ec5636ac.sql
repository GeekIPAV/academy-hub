-- Privacy classification table
CREATE TABLE public.config_privacidade_campos (
  column_name text PRIMARY KEY,
  classification text NOT NULL CHECK (classification IN ('publica','sensivel')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.config_privacidade_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view privacy config"
  ON public.config_privacidade_campos FOR SELECT
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert privacy config"
  ON public.config_privacidade_campos FOR INSERT
  TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins update privacy config"
  ON public.config_privacidade_campos FOR UPDATE
  TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete privacy config"
  ON public.config_privacidade_campos FOR DELETE
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_config_privacidade_updated_at
  BEFORE UPDATE ON public.config_privacidade_campos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: list utilizadores columns from information_schema
CREATE OR REPLACE FUNCTION public.list_utilizadores_columns()
RETURNS TABLE(column_name text, data_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.column_name::text, c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'utilizadores'
  ORDER BY c.ordinal_position;
$$;

REVOKE ALL ON FUNCTION public.list_utilizadores_columns() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_utilizadores_columns() TO authenticated, service_role;

-- Anonymisation routine: nulls every column flagged 'sensivel' for a given user.
-- Excludes structural columns ('id', 'created_at') to avoid breaking referential integrity.
CREATE OR REPLACE FUNCTION public.anonimizar_utilizador(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col record;
  affected integer := 0;
  sql text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito';
  END IF;

  FOR col IN
    SELECT cfg.column_name
    FROM public.config_privacidade_campos cfg
    JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = 'utilizadores'
     AND c.column_name = cfg.column_name
    WHERE cfg.classification = 'sensivel'
      AND cfg.column_name NOT IN ('id','created_at')
      AND c.is_nullable = 'YES'
  LOOP
    sql := format('UPDATE public.utilizadores SET %I = NULL WHERE id = $1', col.column_name);
    EXECUTE sql USING _user_id;
    affected := affected + 1;
  END LOOP;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.anonimizar_utilizador(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.anonimizar_utilizador(uuid) TO authenticated, service_role;