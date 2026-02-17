-- Add INSERT policy for the sync trigger (runs as the creator's auth context)
CREATE POLICY "Sync trigger can insert public room data"
ON public.draft_rooms_public
FOR INSERT
WITH CHECK (true);

-- Add UPDATE policy for the sync trigger
CREATE POLICY "Sync trigger can update public room data"
ON public.draft_rooms_public
FOR UPDATE
USING (true);

-- Add DELETE policy for the sync trigger
CREATE POLICY "Sync trigger can delete public room data"
ON public.draft_rooms_public
FOR DELETE
USING (true);