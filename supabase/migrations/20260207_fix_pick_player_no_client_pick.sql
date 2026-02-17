-- Fix pick_player_atomic to NOT require pick_number from client
-- The server knows the current pick number - client shouldn't send it
-- This prevents race conditions and stale client state issues

-- First drop the old function signature
DROP FUNCTION IF EXISTS public.pick_player_atomic(uuid, integer, uuid, integer, text);

-- Create new function that doesn't require p_pick_number
CREATE OR REPLACE FUNCTION public.pick_player_atomic(
  p_room_id uuid,
  p_captain_number integer,
  p_player_id uuid,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_turn integer;
  v_current_pick integer;
  v_captain_player_id uuid;
  v_draft_order jsonb;
  v_raffle_order integer[];
  v_next_captain integer;
  v_total_players integer;
  v_picked_count integer;
  v_ts_ms bigint;
  v_now_ms bigint;
  v_max_age_ms bigint := 2592000000; -- 30 days
  v_draft_complete boolean := false;
BEGIN
  -- Validate session_id format (required)
  IF p_session_id IS NULL OR p_session_id = '' OR p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_session');
  END IF;

  -- Validate session expiry
  v_ts_ms := substring(p_session_id from '^session_([0-9]+)_[a-z0-9]{9}$')::bigint;
  v_now_ms := (extract(epoch from now()) * 1000)::bigint;
  IF v_ts_ms IS NULL OR (v_now_ms - v_ts_ms) > v_max_age_ms THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_expired');
  END IF;

  -- Get the captain's player_id from draft_rooms
  SELECT
    CASE p_captain_number
      WHEN 1 THEN captain1_player_id
      WHEN 2 THEN captain2_player_id
      WHEN 3 THEN captain3_player_id
    END
  INTO v_captain_player_id
  FROM draft_rooms
  WHERE id = p_room_id;

  IF v_captain_player_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_captain');
  END IF;

  -- AUTHORIZATION CHECK: Verify session owns the captain via draft_room_players
  IF NOT EXISTS (
    SELECT 1 FROM draft_room_players
    WHERE room_id = p_room_id
      AND player_id = v_captain_player_id
      AND is_captain = true
      AND claimed_by_session_id = p_session_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Lock the room row to prevent concurrent picks
  SELECT current_turn_captain_number, current_pick_number, draft_order, raffle_order
  INTO v_current_turn, v_current_pick, v_draft_order, v_raffle_order
  FROM draft_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- Validate it's this captain's turn
  IF v_current_turn != p_captain_number THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_your_turn',
      'current_turn', v_current_turn,
      'current_pick', v_current_pick
    );
  END IF;

  -- Check if this pick number was already used (race condition check)
  IF EXISTS (
    SELECT 1 FROM draft_room_players
    WHERE room_id = p_room_id AND pick_number = v_current_pick
  ) THEN
    -- Someone else already made this pick - return current state
    RETURN jsonb_build_object(
      'success', false,
      'error', 'pick_already_made',
      'current_turn', v_current_turn,
      'current_pick', v_current_pick
    );
  END IF;

  -- Check if player is available (not already picked, not a captain)
  IF EXISTS (
    SELECT 1 FROM draft_room_players
    WHERE id = p_player_id
      AND room_id = p_room_id
      AND (picked_by_captain_number IS NOT NULL OR is_captain = true)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'player_unavailable',
      'current_turn', v_current_turn,
      'current_pick', v_current_pick
    );
  END IF;

  -- Mark the player as picked (use server's current_pick, not client's)
  UPDATE draft_room_players
  SET picked_by_captain_number = p_captain_number,
      pick_number = v_current_pick
  WHERE id = p_player_id
    AND room_id = p_room_id;

  -- Calculate remaining players
  SELECT COUNT(*) INTO v_total_players
  FROM draft_room_players
  WHERE room_id = p_room_id AND is_captain = false;

  SELECT COUNT(*) INTO v_picked_count
  FROM draft_room_players
  WHERE room_id = p_room_id AND picked_by_captain_number IS NOT NULL;

  -- Check if draft is complete
  IF v_picked_count >= v_total_players THEN
    v_draft_complete := true;
    UPDATE draft_rooms
    SET status = 'completed',
        completed_at = now()
    WHERE id = p_room_id;
  ELSE
    -- Calculate next captain from draft_order or raffle_order
    IF v_draft_order IS NOT NULL AND jsonb_array_length(v_draft_order) > 0 THEN
      v_next_captain := (v_draft_order->>((v_current_pick) % jsonb_array_length(v_draft_order)))::integer;
    ELSIF v_raffle_order IS NOT NULL AND array_length(v_raffle_order, 1) = 3 THEN
      -- Build snake pattern from raffle_order: [a,b,c] -> [a,b,c,c,b,a]
      DECLARE
        v_snake integer[];
        v_idx integer;
      BEGIN
        v_snake := ARRAY[
          v_raffle_order[1], v_raffle_order[2], v_raffle_order[3],
          v_raffle_order[3], v_raffle_order[2], v_raffle_order[1]
        ];
        v_idx := (v_current_pick % 6) + 1;
        v_next_captain := v_snake[v_idx];
      END;
    END IF;

    -- Fallback snake pattern if nothing else works (assumes raffle order [1,2,3])
    IF v_next_captain IS NULL OR v_next_captain < 1 OR v_next_captain > 3 THEN
      v_next_captain := CASE (v_current_pick % 6)
        WHEN 0 THEN 1
        WHEN 1 THEN 2
        WHEN 2 THEN 3
        WHEN 3 THEN 3
        WHEN 4 THEN 2
        WHEN 5 THEN 1
      END;
    END IF;

    UPDATE draft_rooms
    SET current_turn_captain_number = v_next_captain,
        current_pick_number = v_current_pick + 1
    WHERE id = p_room_id;

    v_current_pick := v_current_pick + 1;
    v_current_turn := v_next_captain;
  END IF;

  -- Return success with current state
  RETURN jsonb_build_object(
    'success', true,
    'picked_player_id', p_player_id,
    'pick_number', v_current_pick - 1,
    'current_turn', v_current_turn,
    'current_pick', v_current_pick,
    'draft_complete', v_draft_complete
  );
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.pick_player_atomic(uuid, integer, uuid, text) TO anon, authenticated;
