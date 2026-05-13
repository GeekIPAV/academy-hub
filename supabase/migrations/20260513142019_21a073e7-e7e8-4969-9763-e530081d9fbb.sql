
-- programs additions
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS max_capacity integer,
  ADD COLUMN IF NOT EXISTS required_fields jsonb DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS programs_notion_id_unique ON public.programs(notion_id) WHERE notion_id IS NOT NULL;

-- training_actions additions
ALTER TABLE public.training_actions
  ADD COLUMN IF NOT EXISTS notion_id text,
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text;

CREATE UNIQUE INDEX IF NOT EXISTS training_actions_notion_id_unique ON public.training_actions(notion_id) WHERE notion_id IS NOT NULL;

-- training_actions.id should auto-default for app inserts (already required NOT NULL but no default). Ensure default.
ALTER TABLE public.training_actions ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- sync_logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'notion',
  event_type text,
  notion_id text,
  payload jsonb,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Roles helper: assume profiles.role = 'admin' identifies admins
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  );
$$;

-- sync_logs: only admins can read
DROP POLICY IF EXISTS "Admins can read sync logs" ON public.sync_logs;
CREATE POLICY "Admins can read sync logs"
ON public.sync_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Enable RLS on previously-empty tables and add baseline policies
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view programs" ON public.programs;
CREATE POLICY "Public can view programs" ON public.programs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view actions" ON public.training_actions;
CREATE POLICY "Public can view actions" ON public.training_actions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users view own enrollments" ON public.enrollments;
CREATE POLICY "Users view own enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own enrollments" ON public.enrollments;
CREATE POLICY "Users create own enrollments" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
