-- Fix infinite recursion in user_players RLS policy
-- The previous policy caused recursion by querying user_players within its own policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Linked players can view club players" ON public.user_players;

-- Simple policy: users can see their own players only
-- Linked player cross-club visibility will be handled via RPC functions
DROP POLICY IF EXISTS "Users can view own players" ON public.user_players;
CREATE POLICY "Users can view own players"
  ON public.user_players FOR SELECT
  USING (auth.uid() = user_id);

-- Note: Linked players viewing other club members will use
-- get_club_players() RPC function instead of direct table access
