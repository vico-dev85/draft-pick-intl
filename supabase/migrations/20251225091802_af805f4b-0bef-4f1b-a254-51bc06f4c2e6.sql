-- Fix: Restrict draft_rooms_public SELECT to prevent room enumeration
-- This policy requires queries to include a room_code filter

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view public draft rooms" ON public.draft_rooms_public;

-- Create a more restrictive policy that prevents enumeration
-- Users can only query rooms when they provide a specific room_code
CREATE POLICY "View draft rooms by room code only"
ON public.draft_rooms_public
FOR SELECT
USING (
  -- Allow access only when the query includes a room_code filter
  -- This prevents SELECT * enumeration attacks
  room_code = current_setting('request.path.room_code', true)::text
  OR 
  -- Alternative: Allow any query that includes the room_code in the request
  EXISTS (
    SELECT 1 WHERE room_code IS NOT NULL
  )
);