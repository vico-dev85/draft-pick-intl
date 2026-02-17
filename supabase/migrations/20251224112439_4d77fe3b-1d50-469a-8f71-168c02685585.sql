-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to player photos
CREATE POLICY "Player photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload player photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

-- Allow users to update their photos
CREATE POLICY "Users can update player photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

-- Allow users to delete their photos
CREATE POLICY "Users can delete player photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');