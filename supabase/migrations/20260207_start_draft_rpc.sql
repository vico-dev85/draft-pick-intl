-- RPC function to start the draft when all captains are connected
-- Can be called by anyone (creator or captain) - atomically checks conditions and starts
CREATE OR REPLACE FUNCTION public.start_draft_if_ready(
  p_room_id uuid,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
  v_draft_order jsonb;
  v_raffle_order integer[];
  v_first_captain integer;
  v_connected_count integer;
BEGIN
  -- Lock the room row
  SELECT status, draft_order, raffle_order
  INTO v_status, v_draft_order, v_raffle_order
  FROM draft_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- Check if room exists
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;

  -- Check if already drafting or completed
  IF v_status = 'drafting' THEN
    RETURN jsonb_build_object('success', true, 'already_started', true);
  END IF;

  IF v_status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'draft_completed');
  END IF;

  -- Check if all 3 captains are connected
  SELECT COUNT(*)
  INTO v_connected_count
  FROM draft_room_players
  WHERE room_id = p_room_id
    AND is_captain = true
    AND claimed_by_session_id IS NOT NULL;

  IF v_connected_count < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_all_captains_connected', 'connected', v_connected_count);
  END IF;

  -- Check if draft order exists
  IF v_draft_order IS NULL OR jsonb_array_length(v_draft_order) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_draft_order');
  END IF;

  -- Get first captain from draft order
  v_first_captain := (v_draft_order->>0)::integer;

  -- Update status to drafting
  UPDATE draft_rooms
  SET status = 'drafting',
      started_at = now(),
      current_turn_captain_number = v_first_captain,
      current_pick_number = 1
  WHERE id = p_room_id;

  RETURN jsonb_build_object(
    'success', true,
    'first_captain', v_first_captain,
    'started', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_draft_if_ready(uuid, text) TO anon, authenticated;
