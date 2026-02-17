-- Fix player-photos storage bucket security
-- Files will be organized by user folders: {user_id}/{player_id}-{timestamp}.webp

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete player photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view player photos" ON storage.objects;

-- Create secure policies with owner-based access control

-- Public read access (photos are displayed publicly in drafts)
CREATE POLICY "Anyone can view player photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

-- Upload: Users can only upload to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update: Users can only update files in their own folder
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete: Users can only delete files in their own folder
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);