-- Fix WARN-level security issues: hide draft creator identity from public reads and harden session-based RPC authorization

-- 1) Public-safe projection of draft rooms (no creator_user_id)
CREATE TABLE IF NOT EXISTS public.draft_rooms_public (
  id uuid PRIMARY KEY,
  room_code text NOT NULL UNIQUE,
  draft_name text NOT NULL,
  captain1_player_id uuid NULL,
  captain2_player_id uuid NULL,
  captain3_player_id uuid NULL,
  draft_order jsonb NULL,
  status text NOT NULL,
  current_turn_captain_number integer NULL,
  current_pick_number integer NULL,
  created_at timestamptz NOT NULL,
  started_at timestamptz NULL,
  completed_at timestamptz NULL
);

ALTER TABLE public.draft_rooms_public ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'draft_rooms_public'
      AND policyname = 'Anyone can view public draft rooms'
  ) THEN
    CREATE POLICY "Anyone can view public draft rooms"
    ON public.draft_rooms_public
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Initial backfill / upsert from private table
INSERT INTO public.draft_rooms_public (
  id, room_code, draft_name,
  captain1_player_id, captain2_player_id, captain3_player_id,
  draft_order, status, current_turn_captain_number, current_pick_number,
  created_at, started_at, completed_at
)
SELECT
  id, room_code, draft_name,
  captain1_player_id, captain2_player_id, captain3_player_id,
  draft_order, status, current_turn_captain_number, current_pick_number,
  created_at, started_at, completed_at
FROM public.draft_rooms
ON CONFLICT (id) DO UPDATE SET
  room_code = EXCLUDED.room_code,
  draft_name = EXCLUDED.draft_name,
  captain1_player_id = EXCLUDED.captain1_player_id,
  captain2_player_id = EXCLUDED.captain2_player_id,
  captain3_player_id = EXCLUDED.captain3_player_id,
  draft_order = EXCLUDED.draft_order,
  status = EXCLUDED.status,
  current_turn_captain_number = EXCLUDED.current_turn_captain_number,
  current_pick_number = EXCLUDED.current_pick_number,
  created_at = EXCLUDED.created_at,
  started_at = EXCLUDED.started_at,
  completed_at = EXCLUDED.completed_at;

CREATE OR REPLACE FUNCTION public.sync_draft_rooms_public()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.draft_rooms_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.draft_rooms_public (
    id, room_code, draft_name,
    captain1_player_id, captain2_player_id, captain3_player_id,
    draft_order, status, current_turn_captain_number, current_pick_number,
    created_at, started_at, completed_at
  ) VALUES (
    NEW.id, NEW.room_code, NEW.draft_name,
    NEW.captain1_player_id, NEW.captain2_player_id, NEW.captain3_player_id,
    NEW.draft_order, NEW.status, NEW.current_turn_captain_number, NEW.current_pick_number,
    NEW.created_at, NEW.started_at, NEW.completed_at
  )
  ON CONFLICT (id) DO UPDATE SET
    room_code = EXCLUDED.room_code,
    draft_name = EXCLUDED.draft_name,
    captain1_player_id = EXCLUDED.captain1_player_id,
    captain2_player_id = EXCLUDED.captain2_player_id,
    captain3_player_id = EXCLUDED.captain3_player_id,
    draft_order = EXCLUDED.draft_order,
    status = EXCLUDED.status,
    current_turn_captain_number = EXCLUDED.current_turn_captain_number,
    current_pick_number = EXCLUDED.current_pick_number,
    created_at = EXCLUDED.created_at,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS draft_rooms_public_sync_insupd ON public.draft_rooms;
CREATE TRIGGER draft_rooms_public_sync_insupd
AFTER INSERT OR UPDATE ON public.draft_rooms
FOR EACH ROW
EXECUTE FUNCTION public.sync_draft_rooms_public();

DROP TRIGGER IF EXISTS draft_rooms_public_sync_del ON public.draft_rooms;
CREATE TRIGGER draft_rooms_public_sync_del
AFTER DELETE ON public.draft_rooms
FOR EACH ROW
EXECUTE FUNCTION public.sync_draft_rooms_public();

-- Ensure realtime works for the new public table
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_rooms_public;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
    WHEN undefined_object THEN
      NULL;
  END;
END $$;

-- Remove public SELECT from private table to stop exposing creator_user_id
DROP POLICY IF EXISTS "Anyone can view drafts by room code" ON public.draft_rooms;


-- 2) Harden session-based RPC: require session_id and enforce expiry server-side
--    We keep the existing session format: session_<epoch_ms>_<9 base36 chars>

-- claim_player_identity
CREATE OR REPLACE FUNCTION public.claim_player_identity(p_draft_room_player_id uuid, p_session_id text)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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

  -- Check if this session already claimed a player in the same room
  SELECT drp.room_id INTO v_room_id
  FROM draft_room_players drp
  WHERE drp.id = p_draft_room_player_id;

  IF v_room_id IS NULL THEN
    RETURN QUERY SELECT false, 'Player not found'::text;
    RETURN;
  END IF;

  -- Check if session already has a claimed player in this room
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
$$;

-- create_captain_connection
CREATE OR REPLACE FUNCTION public.create_captain_connection(p_room_id uuid, p_captain_player_id uuid, p_session_id text)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_claimed_session text;
  v_is_captain boolean;
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

  -- Verify the session actually owns this player (claimed it)
  SELECT claimed_by_session_id, is_captain 
  INTO v_claimed_session, v_is_captain
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

  -- Check if connection already exists
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
$$;

-- update_captain_heartbeat
CREATE OR REPLACE FUNCTION public.update_captain_heartbeat(p_room_id uuid, p_session_id text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_ts_ms bigint;
  v_now_ms bigint;
  v_max_age_ms bigint := 2592000000; -- 30 days
BEGIN
  IF p_session_id IS NULL OR p_session_id = '' OR p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RETURN;
  END IF;

  v_ts_ms := substring(p_session_id from '^session_([0-9]+)_[a-z0-9]{9}$')::bigint;
  v_now_ms := (extract(epoch from now()) * 1000)::bigint;
  IF v_ts_ms IS NULL OR (v_now_ms - v_ts_ms) > v_max_age_ms THEN
    RETURN;
  END IF;

  UPDATE captain_connections
  SET last_seen_at = now()
  WHERE room_id = p_room_id 
    AND session_id = p_session_id;
END;
$$;

-- pick_player_atomic: drop and recreate to remove DEFAULT NULL + enforce mandatory ownership check
DROP FUNCTION IF EXISTS public.pick_player_atomic(uuid, integer, uuid, integer, text);

CREATE OR REPLACE FUNCTION public.pick_player_atomic(
  p_room_id uuid,
  p_captain_number integer,
  p_player_id uuid,
  p_pick_number integer,
  p_session_id text
)
RETURNS SETOF draft_room_players
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
  v_max_age_ms bigint := 2592000000; -- 30 days
BEGIN
  -- Validate session_id (required)
  IF p_session_id IS NULL OR p_session_id = '' OR p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RAISE EXCEPTION 'Invalid session ID format';
  END IF;

  v_ts_ms := substring(p_session_id from '^session_([0-9]+)_[a-z0-9]{9}$')::bigint;
  v_now_ms := (extract(epoch from now()) * 1000)::bigint;
  IF v_ts_ms IS NULL OR (v_now_ms - v_ts_ms) > v_max_age_ms THEN
    RAISE EXCEPTION 'Session expired';
  END IF;

  -- AUTHORIZATION CHECK (mandatory): Verify session owns the captain making this pick
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
    RAISE EXCEPTION 'Invalid captain number or room';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM captain_connections
    WHERE room_id = p_room_id
      AND captain_player_id = v_captain_player_id
      AND session_id = p_session_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Session does not control this captain';
  END IF;

  -- Lock the room row to prevent concurrent picks
  SELECT current_turn_captain_number, current_pick_number, draft_order
  INTO v_current_turn, v_current_pick, v_draft_order
  FROM draft_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- Validate turn
  IF v_current_turn != p_captain_number THEN
    RAISE EXCEPTION 'Not your turn. Current turn: captain %', v_current_turn;
  END IF;

  IF v_current_pick != p_pick_number THEN
    RAISE EXCEPTION 'Wrong pick number. Current pick: %', v_current_pick;
  END IF;

  -- Check if player is available
  IF EXISTS (
    SELECT 1 FROM draft_room_players
    WHERE id = p_player_id 
      AND room_id = p_room_id
      AND (picked_by_captain_number IS NOT NULL OR is_captain = true)
  ) THEN
    RAISE EXCEPTION 'Player already picked or is a captain';
  END IF;

  -- Mark the player as picked
  UPDATE draft_room_players
  SET picked_by_captain_number = p_captain_number,
      pick_number = p_pick_number
  WHERE id = p_player_id
    AND room_id = p_room_id;

  -- Calculate next turn from draft order
  SELECT COUNT(*) INTO v_total_players
  FROM draft_room_players
  WHERE room_id = p_room_id AND is_captain = false;

  SELECT COUNT(*) INTO v_picked_count
  FROM draft_room_players
  WHERE room_id = p_room_id AND picked_by_captain_number IS NOT NULL;

  -- Check if draft is complete
  IF v_picked_count >= v_total_players THEN
    UPDATE draft_rooms
    SET status = 'completed',
        completed_at = now(),
        current_pick_number = v_current_pick
    WHERE id = p_room_id;
  ELSE
    v_next_captain := (v_draft_order->>((v_current_pick) % jsonb_array_length(v_draft_order)))::integer;
    IF v_next_captain IS NULL OR v_next_captain < 1 OR v_next_captain > 3 THEN
      v_next_captain := CASE 
        WHEN (v_current_pick % 6) IN (0, 5) THEN 3
        WHEN (v_current_pick % 6) IN (1, 4) THEN 2
        ELSE 1
      END;
    END IF;

    UPDATE draft_rooms
    SET current_turn_captain_number = v_next_captain,
        current_pick_number = v_current_pick + 1
    WHERE id = p_room_id;
  END IF;

  RETURN QUERY
  SELECT * FROM draft_room_players WHERE id = p_player_id;
END;
$$;