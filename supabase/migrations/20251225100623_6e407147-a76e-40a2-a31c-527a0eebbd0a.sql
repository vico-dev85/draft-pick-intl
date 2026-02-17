-- Fix the create_captain_connection function to correctly match captain IDs
-- The function receives p_captain_player_id which is draft_room_players.id
-- But it was comparing against draft_rooms.captain1_player_id which is user_players.id
-- We need to join through draft_room_players to validate

CREATE OR REPLACE FUNCTION public.create_captain_connection(p_room_id uuid, p_captain_player_id uuid, p_session_id text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_claimed_session text;
  v_is_captain boolean;
  v_player_id uuid;
  v_ts_ms bigint;
  v_now_ms bigint;
  v_max_age_ms bigint := 2592000000; -- 30 days
BEGIN
  IF p_session_id IS NULL OR p_session_id = '' OR p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RETURN QUERY SELECT false, 'Invalid session ID format'::text;
    RETURN;
  END IF;

  v_ts_ms := substring(p_session_id from '^session_([0-9]+)_[a-z0-9]{9}$')::bigint;
  v_now_ms := (extract(epoch from now()) * 1000)::bigint;
  IF v_ts_ms IS NULL OR (v_now_ms - v_ts_ms) > v_max_age_ms THEN
    RETURN QUERY SELECT false, 'Session expired'::text;
    RETURN;
  END IF;

  -- p_captain_player_id is actually draft_room_players.id
  -- Verify the session owns this draft_room_player and it's a captain
  SELECT claimed_by_session_id, is_captain, player_id
  INTO v_claimed_session, v_is_captain, v_player_id
  FROM draft_room_players
  WHERE id = p_captain_player_id AND room_id = p_room_id;

  IF v_claimed_session IS NULL THEN
    RETURN QUERY SELECT false, 'Player not found or not claimed'::text;
    RETURN;
  END IF;

  IF v_claimed_session != p_session_id THEN
    RETURN QUERY SELECT false, 'Session does not own this player'::text;
    RETURN;
  END IF;

  IF NOT v_is_captain THEN
    RETURN QUERY SELECT false, 'Player is not a captain'::text;
    RETURN;
  END IF;

  -- Verify this player_id matches one of the captain slots in draft_rooms
  IF NOT EXISTS (
    SELECT 1 FROM draft_rooms
    WHERE id = p_room_id
      AND (captain1_player_id = v_player_id 
           OR captain2_player_id = v_player_id 
           OR captain3_player_id = v_player_id)
  ) THEN
    RETURN QUERY SELECT false, 'Player is not assigned as captain in this room'::text;
    RETURN;
  END IF;

  -- Check if connection already exists for this draft_room_player
  IF EXISTS (
    SELECT 1 FROM captain_connections 
    WHERE room_id = p_room_id AND captain_player_id = p_captain_player_id
  ) THEN
    UPDATE captain_connections
    SET is_connected = true, last_seen_at = now()
    WHERE room_id = p_room_id AND captain_player_id = p_captain_player_id;
  ELSE
    INSERT INTO captain_connections (room_id, captain_player_id, session_id, is_connected)
    VALUES (p_room_id, p_captain_player_id, p_session_id, true);
  END IF;

  RETURN QUERY SELECT true, 'Connection created'::text;
END;
$function$;