
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone authenticated to read (bucket is also public for direct URL access)
CREATE POLICY "Public can read resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'resources');

CREATE POLICY "Admins can upload resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resources' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete resources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resources' AND public.is_admin(auth.uid()));

-- Add missing policies on learning_resources
CREATE POLICY "Admins can update learning resources"
ON public.learning_resources FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete learning resources"
ON public.learning_resources FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
