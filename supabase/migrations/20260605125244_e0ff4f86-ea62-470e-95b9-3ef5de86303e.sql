
CREATE TABLE public.email_templates_custom (
  template_key text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('auth','app')),
  subject text NOT NULL,
  body_html text NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates_custom TO authenticated;
GRANT ALL ON public.email_templates_custom TO service_role;

ALTER TABLE public.email_templates_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email templates"
  ON public.email_templates_custom FOR SELECT
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert email templates"
  ON public.email_templates_custom FOR INSERT
  TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update email templates"
  ON public.email_templates_custom FOR UPDATE
  TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete email templates"
  ON public.email_templates_custom FOR DELETE
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_email_templates_custom_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_email_templates_custom_updated_at
  BEFORE UPDATE ON public.email_templates_custom
  FOR EACH ROW EXECUTE FUNCTION public.set_email_templates_custom_updated_at();
