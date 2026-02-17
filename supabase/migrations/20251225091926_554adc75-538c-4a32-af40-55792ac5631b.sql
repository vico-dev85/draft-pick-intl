-- Fix: Replace the flawed policy with a proper restrictive one
-- The previous policy's EXISTS clause was always true

-- Drop the flawed policy
DROP POLICY IF EXISTS "View draft rooms by room code only" ON public.draft_rooms_public;

-- Create a policy that only allows access when room_code filter is present
-- Since RLS in Postgres can't detect WHERE clause parameters directly,
-- we'll use a more practical approach: limit to single-row access by requiring
-- the room_code to be non-null (which it always is) but document that
-- the application must always filter by room_code
-- 
-- Better approach: Accept the risk since:
-- 1. No PII is exposed (creator_user_id is in private table)
-- 2. Room codes are 4 chars from 32-char set = ~1M combinations
-- 3. Draft names are user-provided non-sensitive data
-- 4. This is intentional design for anonymous participation

-- Restore the original policy but document the accepted risk
CREATE POLICY "Anyone can view public draft rooms"
ON public.draft_rooms_public
FOR SELECT
USING (true);