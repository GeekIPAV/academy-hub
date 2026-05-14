-- Enable RLS and policies for program_enrollments so a Formando can see/update own enrollment
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own program enrollments"
ON public.program_enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update own program enrollments"
ON public.program_enrollments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
