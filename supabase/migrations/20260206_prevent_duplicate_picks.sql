-- Prevent duplicate pick numbers in a draft room
-- This adds a unique constraint and updates the pick function to check for duplicates

-- Add unique constraint (will fail if duplicates already exist - clean up first)
-- ALTER TABLE draft_room_players
-- ADD CONSTRAINT unique_pick_per_room UNIQUE (room_id, pick_number);

-- Update pick_player_atomic to check for duplicate pick numbers
CREATE OR REPLACE FUNCTION public.pick_player_atomic(
  p_room_id uuid,
  p_captain_number integer,
  p_player_id uuid,
  p_pick_number integer,
  p_session_id text
)
RETURNS SETOF public.draft_room_players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_turn integer;
  v_current_pick integer;
  v_captain_player_id uuid;
  v_draft_order jsonb;
  v_next_captain integer;
  v_total_players integer;
  v_picked_count integer;
  v_ts_ms bigint;
  v_now_ms bigint;
  v_max_age_ms bigint := 2592000000;
BEGIN
  -- Validate session_id format
  IF p_session_id IS NULL OR p_session_id = '' OR p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RAISE EXCEPTION 'Invalid session ID format';
  END IF;

  -- Validate session expiry
  v_ts_ms := substring(p_session_id from '^session_([0-9]+)_[a-z0-9]{9}$')::bigint;
  v_now_ms := (extract(epoch from now()) * 1000)::bigint;
  IF v_ts_ms IS NULL OR (v_now_ms - v_ts_ms) > v_max_age_ms THEN
    RAISE EXCEPTION 'Session expired';
  END IF;

  -- Get the captain's player_id
  SELECT CASE p_captain_number
      WHEN 1 THEN captain1_player_id
      WHEN 2 THEN captain2_player_id
      WHEN 3 THEN captain3_player_id
    END
  INTO v_captain_player_id
  FROM public.draft_rooms WHERE id = p_room_id;

  IF v_captain_player_id IS NULL THEN
    RAISE EXCEPTION 'Invalid captain number or room';
  END IF;

  -- Authorization check
  IF NOT EXISTS (
    SELECT 1 FROM public.draft_room_players
    WHERE room_id = p_room_id AND player_id = v_captain_player_id
      AND is_captain = true AND claimed_by_session_id = p_session_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Session does not control this captain';
  END IF;

  -- Lock the room row to prevent concurrent picks
  SELECT current_turn_captain_number, current_pick_number, draft_order
  INTO v_current_turn, v_current_pick, v_draft_order
  FROM public.draft_rooms WHERE id = p_room_id FOR UPDATE;

  -- Validate turn
  IF v_current_turn != p_captain_number THEN
    RAISE EXCEPTION 'Not your turn. Current turn: captain %, you are captain %', v_current_turn, p_captain_number;
  END IF;

  -- Validate pick number
  IF v_current_pick != p_pick_number THEN
    RAISE EXCEPTION 'Wrong pick number. Server: %, Client: %', v_current_pick, p_pick_number;
  END IF;

  -- NEW: Check if this pick number was already used (prevents race condition duplicates)
  IF EXISTS (
    SELECT 1 FROM public.draft_room_players
    WHERE room_id = p_room_id AND pick_number = p_pick_number
  ) THEN
    RAISE EXCEPTION 'Pick number % already used - possible race condition', p_pick_number;
  END IF;

  -- Check if player is available
  IF EXISTS (
    SELECT 1 FROM public.draft_room_players
    WHERE id = p_player_id AND room_id = p_room_id
      AND (picked_by_captain_number IS NOT NULL OR is_captain = true)
  ) THEN
    RAISE EXCEPTION 'Player already picked or is a captain';
  END IF;

  -- Mark the player as picked
  UPDATE public.draft_room_players
  SET picked_by_captain_number = p_captain_number, pick_number = p_pick_number
  WHERE id = p_player_id AND room_id = p_room_id;

  -- Calculate remaining players
  SELECT COUNT(*) INTO v_total_players
  FROM public.draft_room_players WHERE room_id = p_room_id AND is_captain = false;

  SELECT COUNT(*) INTO v_picked_count
  FROM public.draft_room_players WHERE room_id = p_room_id AND picked_by_captain_number IS NOT NULL;

  -- Check if draft is complete
  IF v_picked_count >= v_total_players THEN
    UPDATE public.draft_rooms SET status = 'completed', completed_at = now(), current_pick_number = v_current_pick
    WHERE id = p_room_id;
  ELSE
    -- Calculate next captain
    IF v_draft_order IS NOT NULL AND jsonb_array_length(v_draft_order) > 0 THEN
      v_next_captain := (v_draft_order->>((v_current_pick) % jsonb_array_length(v_draft_order)))::integer;
    END IF;

    IF v_next_captain IS NULL OR v_next_captain < 1 OR v_next_captain > 3 THEN
      v_next_captain := CASE (v_current_pick % 6)
        WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 3
        WHEN 3 THEN 3 WHEN 4 THEN 2 WHEN 5 THEN 1
      END;
    END IF;

    UPDATE public.draft_rooms SET current_turn_captain_number = v_next_captain,
        current_pick_number = v_current_pick + 1
    WHERE id = p_room_id;
  END IF;

  RETURN QUERY SELECT * FROM public.draft_room_players WHERE id = p_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pick_player_atomic(uuid, integer, uuid, integer, text) TO anon, authenticated;
