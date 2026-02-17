-- Create an RPC function to get fresh draft room state
-- RPC calls use POST and are not cached by CDNs like Cloudflare
-- This ensures captains always see the current turn

CREATE OR REPLACE FUNCTION public.get_draft_state(p_room_id uuid)
RETURNS TABLE (
  current_turn_captain_number integer,
  current_pick_number integer,
  status text,
  draft_order jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    current_turn_captain_number,
    current_pick_number,
    status,
    draft_order
  FROM draft_rooms
  WHERE id = p_room_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_draft_state(uuid) TO anon, authenticated;
