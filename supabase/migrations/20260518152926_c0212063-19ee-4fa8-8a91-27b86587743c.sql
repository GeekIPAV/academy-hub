INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados', 'certificados', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read certificados" ON storage.objects;
CREATE POLICY "Public can read certificados"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificados');