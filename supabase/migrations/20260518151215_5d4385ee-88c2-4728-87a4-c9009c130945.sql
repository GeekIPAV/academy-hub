-- Create participantes_acoes table for school participants (no user account)
CREATE TABLE public.participantes_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.acoes(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  tshirt_size text NOT NULL,
  attendance_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_participantes_acoes_action_id ON public.participantes_acoes(action_id);

ALTER TABLE public.participantes_acoes ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage all participantes"
  ON public.participantes_acoes
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Entity reps: can view participants of their own actions
CREATE POLICY "Entity rep view own participantes"
  ON public.participantes_acoes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.acoes a
      WHERE a.id = participantes_acoes.action_id
        AND a.entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
    )
  );

-- Entity reps: insert participants in their own actions
CREATE POLICY "Entity rep insert own participantes"
  ON public.participantes_acoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.acoes a
      WHERE a.id = participantes_acoes.action_id
        AND a.entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
    )
  );

-- Entity reps: update participants in their own actions
CREATE POLICY "Entity rep update own participantes"
  ON public.participantes_acoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.acoes a
      WHERE a.id = participantes_acoes.action_id
        AND a.entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.acoes a
      WHERE a.id = participantes_acoes.action_id
        AND a.entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
    )
  );

-- Entity reps: delete participants in their own actions
CREATE POLICY "Entity rep delete own participantes"
  ON public.participantes_acoes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.acoes a
      WHERE a.id = participantes_acoes.action_id
        AND a.entity_id = (SELECT entity_id FROM public.utilizadores WHERE id = auth.uid())
    )
  );