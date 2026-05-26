-- =====================================================
-- Share Images Storage Bucket
-- =====================================================
-- Public read so the URL works in WhatsApp / Twitter / link unfurlers.
-- Authenticated write so only logged-in users can upload (they can only
-- upload one image per draft they own, see RLS below).
--
-- TO APPLY: paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('share-images', 'share-images', true, 2097152) -- 2 MB max
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

-- Drop existing policies (idempotent re-runs)
DROP POLICY IF EXISTS "share images: anyone can read" ON storage.objects;
DROP POLICY IF EXISTS "share images: authenticated can write" ON storage.objects;
DROP POLICY IF EXISTS "share images: authenticated can update" ON storage.objects;
DROP POLICY IF EXISTS "share images: authenticated can delete" ON storage.objects;

CREATE POLICY "share images: anyone can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'share-images');

CREATE POLICY "share images: authenticated can write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'share-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "share images: authenticated can update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'share-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "share images: authenticated can delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'share-images' AND auth.uid() IS NOT NULL);
