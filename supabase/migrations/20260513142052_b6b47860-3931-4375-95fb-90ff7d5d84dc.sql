
-- Enable RLS on previously-unprotected tables
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read automation logs" ON public.automation_logs;
CREATE POLICY "Admins can read automation logs" ON public.automation_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public can view notion entities" ON public.notion_entities;
CREATE POLICY "Public can view notion entities" ON public.notion_entities FOR SELECT USING (true);

-- Recreate view without security definer
DROP VIEW IF EXISTS public.action_stats;
CREATE VIEW public.action_stats
WITH (security_invoker = true)
AS
SELECT action_id,
    count(*) FILTER (WHERE status = 'aceite') AS confirmed_count,
    count(*) FILTER (WHERE status = 'suplente') AS waiting_list_count
FROM public.enrollments
GROUP BY action_id;

-- Lock down is_admin
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;

-- Fix search_path on existing function
CREATE OR REPLACE FUNCTION public.get_next_in_line(target_action_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT user_id 
  FROM public.enrollments 
  WHERE action_id = target_action_id 
    AND status = 'suplente'
  ORDER BY submitted_at ASC
  LIMIT 1;
$$;
