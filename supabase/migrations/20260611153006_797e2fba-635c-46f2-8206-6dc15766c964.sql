
CREATE TABLE public.entity_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','recusado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_notes text
);

CREATE UNIQUE INDEX entity_transfer_requests_unique_pending
  ON public.entity_transfer_requests (entity_id, requester_id)
  WHERE status = 'pendente';

CREATE INDEX entity_transfer_requests_requester_idx
  ON public.entity_transfer_requests (requester_id, status);

GRANT SELECT, INSERT ON public.entity_transfer_requests TO authenticated;
GRANT ALL ON public.entity_transfer_requests TO service_role;

ALTER TABLE public.entity_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester can view own requests"
  ON public.entity_transfer_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Requester can create own request"
  ON public.entity_transfer_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Admin can update transfer requests"
  ON public.entity_transfer_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
