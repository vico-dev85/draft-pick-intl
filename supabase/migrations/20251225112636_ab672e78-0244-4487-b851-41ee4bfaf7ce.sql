-- Allow guests to claim identities + fetch room players safely (bypass RLS on user_players)

-- 1) Make claim_player_identity bypass RLS so guests can claim draft_room_players
CREATE OR REPLACE FUNCTION public.claim_player_identity(p_draft_room_player_id uuid, p_session_id text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_claimed_by text;
  v_room_id uuid;
  v_ts_ms bigint;
  v_now_ms bigint;
  v_max_age_ms bigint := 2592000000; -- 30 days
BEGIN
  -- Validate session_id format
  IF p_session_id IS NULL OR p_session_id = '' OR p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RETURN QUERY SELECT false, 'Invalid session ID format'::text;
    RETURN;
  END IF;

  -- Expiration check based on timestamp embedded in session_id
  v_ts_ms := substring(p_session_id from '^session_([0-9]+)_[a-z0-9]{9}$')::bigint;
  v_now_ms := (extract(epoch from now()) * 1000)::bigint;
  IF v_ts_ms IS NULL OR (v_now_ms - v_ts_ms) > v_max_age_ms THEN
    RETURN QUERY SELECT false, 'Session expired'::text;
    RETURN;
  END IF;

  -- Determine room_id
  SELECT drp.room_id INTO v_room_id
  FROM draft_room_players drp
  WHERE drp.id = p_draft_room_player_id;

  IF v_room_id IS NULL THEN
    RETURN QUERY SELECT false, 'Player not found'::text;
    RETURN;
  END IF;

  -- Ensure this session has not already claimed someone in this room
  IF EXISTS (
    SELECT 1 FROM draft_room_players 
    WHERE room_id = v_room_id 
      AND claimed_by_session_id = p_session_id
  ) THEN
    RETURN QUERY SELECT false, 'Session already claimed a player'::text;
    RETURN;
  END IF;

  -- Attempt atomic claim
  UPDATE draft_room_players
  SET claimed_by_session_id = p_session_id
  WHERE id = p_draft_room_player_id
    AND claimed_by_session_id IS NULL
  RETURNING claimed_by_session_id INTO v_claimed_by;

  IF v_claimed_by IS NULL THEN
    RETURN QUERY SELECT false, 'Player already claimed'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Successfully claimed'::text;
END;
$function$;

-- 2) Public-safe RPC to fetch room players with names/photos (without opening user_players RLS)
CREATE OR REPLACE FUNCTION public.get_room_players_public(p_room_code text)
RETURNS TABLE(
  room_id uuid,
  id uuid,
  player_id uuid,
  is_captain boolean,
  guest_name text,
  claimed_by_session_id text,
  pick_number integer,
  picked_by_captain_number integer,
  display_name text,
  photo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    drp.room_id,
    drp.id,
    drp.player_id,
    COALESCE(drp.is_captain, false) AS is_captain,
    drp.guest_name,
    drp.claimed_by_session_id,
    drp.pick_number,
    drp.picked_by_captain_number,
    COALESCE(up.name, drp.guest_name, 'שחקן') AS display_name,
    up.photo_url
  FROM draft_room_players drp
  JOIN draft_rooms_public dr ON dr.id = drp.room_id
  LEFT JOIN user_players up ON up.id = drp.player_id
  WHERE dr.room_code = UPPER(p_room_code);
END;
$function$;

-- 3) Ensure anon/authenticated can call these RPCs
GRANT EXECUTE ON FUNCTION public.claim_player_identity(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_captain_connection(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_captain_heartbeat(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_players_public(text) TO anon, authenticated;
