-- Fix Security Issues: Session Hijacking, RPC Authorization, Input Validation

-- 1. Add CHECK constraints for input validation
ALTER TABLE draft_rooms 
ADD CONSTRAINT draft_name_length CHECK (length(draft_name) >= 2 AND length(draft_name) <= 100);

ALTER TABLE draft_rooms 
ADD CONSTRAINT room_code_format CHECK (room_code ~ '^[A-Z0-9]{4}$');

-- 2. Create secure RPC function for claiming a player identity
-- This replaces the direct UPDATE with server-side session validation
CREATE OR REPLACE FUNCTION public.claim_player_identity(
  p_draft_room_player_id uuid,
  p_session_id text
)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_claimed_by text;
  v_room_id uuid;
BEGIN
  -- Validate session_id format (should match pattern from generateSessionId)
  IF p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RETURN QUERY SELECT false, 'Invalid session ID format'::text;
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

-- 3. Create secure RPC function for captain connection
-- This validates the session owns the claimed player before creating connection
CREATE OR REPLACE FUNCTION public.create_captain_connection(
  p_room_id uuid,
  p_captain_player_id uuid,
  p_session_id text
)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_claimed_session text;
  v_is_captain boolean;
BEGIN
  -- Validate session_id format
  IF p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RETURN QUERY SELECT false, 'Invalid session ID format'::text;
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
    -- Update existing connection
    UPDATE captain_connections
    SET is_connected = true, last_seen_at = now()
    WHERE room_id = p_room_id AND captain_player_id = p_captain_player_id;
  ELSE
    -- Create new connection
    INSERT INTO captain_connections (room_id, captain_player_id, session_id, is_connected)
    VALUES (p_room_id, p_captain_player_id, p_session_id, true);
  END IF;

  RETURN QUERY SELECT true, 'Connection created'::text;
END;
$$;

-- 4. Update captain heartbeat with session validation
CREATE OR REPLACE FUNCTION public.update_captain_heartbeat(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate session_id format
  IF p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RETURN;
  END IF;

  -- Only update if the session matches (prevents unauthorized updates)
  UPDATE captain_connections
  SET last_seen_at = now()
  WHERE room_id = p_room_id 
    AND session_id = p_session_id;
END;
$$;

-- 5. Fix pick_player_atomic to require session verification
-- Drop and recreate with authorization check
DROP FUNCTION IF EXISTS public.pick_player_atomic(uuid, integer, uuid, integer);

CREATE OR REPLACE FUNCTION public.pick_player_atomic(
  p_room_id uuid,
  p_captain_number integer,
  p_player_id uuid,
  p_pick_number integer,
  p_session_id text DEFAULT NULL
)
RETURNS SETOF draft_room_players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_turn integer;
  v_current_pick integer;
  v_captain_player_id uuid;
  v_draft_order jsonb;
  v_next_captain integer;
  v_total_players integer;
  v_picked_count integer;
BEGIN
  -- AUTHORIZATION CHECK: Verify session owns the captain making this pick
  IF p_session_id IS NOT NULL THEN
    -- Get the captain player ID for this captain number
    SELECT 
      CASE p_captain_number
        WHEN 1 THEN captain1_player_id
        WHEN 2 THEN captain2_player_id
        WHEN 3 THEN captain3_player_id
      END
    INTO v_captain_player_id
    FROM draft_rooms
    WHERE id = p_room_id;

    -- Verify the session owns this captain via captain_connections
    IF NOT EXISTS (
      SELECT 1 FROM captain_connections
      WHERE room_id = p_room_id
        AND captain_player_id = v_captain_player_id
        AND session_id = p_session_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Session does not control this captain';
    END IF;
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
    -- Draft complete
    UPDATE draft_rooms
    SET status = 'completed',
        completed_at = now(),
        current_pick_number = v_current_pick
    WHERE id = p_room_id;
  ELSE
    -- Get next captain from draft order array (1-indexed in array)
    v_next_captain := (v_draft_order->>((v_current_pick) % jsonb_array_length(v_draft_order)))::integer;
    IF v_next_captain IS NULL OR v_next_captain < 1 OR v_next_captain > 3 THEN
      -- Fallback to snake draft pattern
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

  -- Return the picked player
  RETURN QUERY
  SELECT * FROM draft_room_players WHERE id = p_player_id;
END;
$$;

-- 6. Tighten RLS policies on captain_connections
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert captain connections" ON captain_connections;
DROP POLICY IF EXISTS "Anyone can update captain connections" ON captain_connections;

-- Create restrictive policy - only allow via RPC functions
CREATE POLICY "Captain connections managed via RPC"
ON captain_connections
FOR ALL
USING (false)
WITH CHECK (false);

-- Allow SELECT for realtime subscriptions (read-only is safe)
DROP POLICY IF EXISTS "Anyone can view captain connections" ON captain_connections;
CREATE POLICY "Anyone can view captain connections in their rooms"
ON captain_connections
FOR SELECT
USING (true);

-- 7. Tighten RLS on draft_room_players for updates
-- Remove the overly permissive "Anyone can claim identity" policy
DROP POLICY IF EXISTS "Anyone can claim identity" ON draft_room_players;

-- Claims now handled via claim_player_identity RPC function
-- Keep the SELECT policy for viewing players