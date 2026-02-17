-- Draft Soccer - Complete Initial Schema
-- This creates all tables, functions, policies, and triggers needed for the MVP

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- User profiles (auto-created on signup)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Owner's player pool (their saved players)
CREATE TABLE IF NOT EXISTS public.user_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Draft rooms (private - contains creator_user_id)
CREATE TABLE IF NOT EXISTS public.draft_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_name text NOT NULL,
  room_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'drafting', 'completed')),
  captain1_player_id uuid REFERENCES public.user_players(id),
  captain2_player_id uuid REFERENCES public.user_players(id),
  captain3_player_id uuid REFERENCES public.user_players(id),
  draft_order jsonb,
  current_turn_captain_number integer,
  current_pick_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT room_code_format CHECK (room_code ~ '^[A-Z0-9]{4}$')
);

-- Draft rooms public view (no creator_user_id - safe for public access)
CREATE TABLE IF NOT EXISTS public.draft_rooms_public (
  id uuid PRIMARY KEY,
  room_code text NOT NULL UNIQUE,
  draft_name text NOT NULL,
  captain1_player_id uuid,
  captain2_player_id uuid,
  captain3_player_id uuid,
  draft_order jsonb,
  status text NOT NULL,
  current_turn_captain_number integer,
  current_pick_number integer,
  created_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz
);

-- Players assigned to a specific draft
CREATE TABLE IF NOT EXISTS public.draft_room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.draft_rooms(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.user_players(id),
  is_captain boolean DEFAULT false,
  is_guest boolean DEFAULT false,
  guest_name text,
  claimed_by_session_id text,
  picked_by_captain_number integer CHECK (picked_by_captain_number IN (1, 2, 3)),
  pick_number integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Legacy captain connections table (kept for compatibility, not used by new auth)
CREATE TABLE IF NOT EXISTS public.captain_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.draft_rooms(id) ON DELETE CASCADE,
  captain_player_id uuid NOT NULL REFERENCES public.user_players(id),
  session_id text NOT NULL,
  is_connected boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

-- Error logs for debugging
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL,
  severity text NOT NULL,
  error jsonb NOT NULL,
  context jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_players_user_id ON public.user_players(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_rooms_creator ON public.draft_rooms(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_draft_rooms_room_code ON public.draft_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_draft_room_players_room_id ON public.draft_room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_draft_room_players_claimed ON public.draft_room_players(claimed_by_session_id);
CREATE INDEX IF NOT EXISTS idx_captain_connections_room ON public.captain_connections(room_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_rooms_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captain_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- User players policies
CREATE POLICY "Users can view own players" ON public.user_players
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own players" ON public.user_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own players" ON public.user_players
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own players" ON public.user_players
  FOR DELETE USING (auth.uid() = user_id);

-- Draft rooms policies (private table - only creator can access directly)
CREATE POLICY "Creators can view own drafts" ON public.draft_rooms
  FOR SELECT USING (auth.uid() = creator_user_id);
CREATE POLICY "Creators can insert drafts" ON public.draft_rooms
  FOR INSERT WITH CHECK (auth.uid() = creator_user_id);
CREATE POLICY "Creators can update own drafts" ON public.draft_rooms
  FOR UPDATE USING (auth.uid() = creator_user_id);
CREATE POLICY "Creators can delete own drafts" ON public.draft_rooms
  FOR DELETE USING (auth.uid() = creator_user_id);

-- Draft rooms public policies (anyone can view)
CREATE POLICY "Anyone can view public draft rooms" ON public.draft_rooms_public
  FOR SELECT USING (true);

-- Draft room players policies
CREATE POLICY "Anyone can view draft players" ON public.draft_room_players
  FOR SELECT USING (true);
CREATE POLICY "Creators can insert draft players" ON public.draft_room_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.draft_rooms
      WHERE id = room_id AND creator_user_id = auth.uid()
    )
  );

-- Captain connections policies
CREATE POLICY "Anyone can view captain connections" ON public.captain_connections
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert captain connections" ON public.captain_connections
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update captain connections" ON public.captain_connections
  FOR UPDATE USING (true);

-- Error logs policies
CREATE POLICY "Anyone can insert error logs" ON public.error_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 4. TRIGGER: Sync draft_rooms to draft_rooms_public
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_draft_rooms_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================================================
-- 5. TRIGGER: Auto-create profile on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. RPC FUNCTIONS
-- ============================================================================

-- Claim player identity (for captains and players joining via link)
CREATE OR REPLACE FUNCTION public.claim_player_identity(
  p_draft_room_player_id uuid,
  p_session_id text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
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
$$;

-- Get room players with display names (bypasses user_players RLS)
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
AS $$
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
$$;

-- Pick player atomic (with FIXED authorization check via draft_room_players)
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
  -- Validate session_id format (required)
  IF p_session_id IS NULL OR p_session_id = '' OR p_session_id !~ '^session_[0-9]+_[a-z0-9]{9}$' THEN
    RAISE EXCEPTION 'Invalid session ID format';
  END IF;

  -- Validate session expiry
  v_ts_ms := substring(p_session_id from '^session_([0-9]+)_[a-z0-9]{9}$')::bigint;
  v_now_ms := (extract(epoch from now()) * 1000)::bigint;
  IF v_ts_ms IS NULL OR (v_now_ms - v_ts_ms) > v_max_age_ms THEN
    RAISE EXCEPTION 'Session expired';
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
    RAISE EXCEPTION 'Invalid captain number or room';
  END IF;

  -- AUTHORIZATION CHECK: Verify session owns the captain via draft_room_players
  -- The session must have claimed this captain's identity via claim_player_identity().
  IF NOT EXISTS (
    SELECT 1 FROM draft_room_players
    WHERE room_id = p_room_id
      AND player_id = v_captain_player_id
      AND is_captain = true
      AND claimed_by_session_id = p_session_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Session does not control this captain';
  END IF;

  -- Lock the room row to prevent concurrent picks
  SELECT current_turn_captain_number, current_pick_number, draft_order
  INTO v_current_turn, v_current_pick, v_draft_order
  FROM draft_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- Validate it's this captain's turn
  IF v_current_turn != p_captain_number THEN
    RAISE EXCEPTION 'Not your turn. Current turn: captain %', v_current_turn;
  END IF;

  IF v_current_pick != p_pick_number THEN
    RAISE EXCEPTION 'Wrong pick number. Current pick: %', v_current_pick;
  END IF;

  -- Check if player is available (not already picked, not a captain)
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

  -- Calculate remaining players
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
    -- Calculate next captain from snake draft order
    v_next_captain := (v_draft_order->>((v_current_pick) % jsonb_array_length(v_draft_order)))::integer;
    IF v_next_captain IS NULL OR v_next_captain < 1 OR v_next_captain > 3 THEN
      -- Fallback snake pattern if draft_order is invalid
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

-- Legacy: create_captain_connection (kept for compatibility, not used by new auth)
CREATE OR REPLACE FUNCTION public.create_captain_connection(
  p_room_id uuid,
  p_captain_player_id uuid,
  p_session_id text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function is deprecated. Captain auth now uses draft_room_players.claimed_by_session_id
  -- Keeping for backward compatibility but it's not required for the draft flow.

  IF EXISTS (
    SELECT 1 FROM captain_connections
    WHERE room_id = p_room_id AND captain_player_id = p_captain_player_id
  ) THEN
    UPDATE captain_connections
    SET is_connected = true, last_seen_at = now(), session_id = p_session_id
    WHERE room_id = p_room_id AND captain_player_id = p_captain_player_id;
  ELSE
    INSERT INTO captain_connections (room_id, captain_player_id, session_id, is_connected)
    VALUES (p_room_id, p_captain_player_id, p_session_id, true);
  END IF;

  RETURN QUERY SELECT true, 'Connection created'::text;
END;
$$;

-- Legacy: update_captain_heartbeat (kept for compatibility)
CREATE OR REPLACE FUNCTION public.update_captain_heartbeat(
  p_room_id uuid,
  p_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE captain_connections
  SET last_seen_at = now()
  WHERE room_id = p_room_id
    AND session_id = p_session_id;
END;
$$;

-- ============================================================================
-- 7. GRANT PERMISSIONS TO anon AND authenticated ROLES
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.claim_player_identity(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_players_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_player_atomic(uuid, integer, uuid, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_captain_connection(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_captain_heartbeat(uuid, text) TO anon, authenticated;

-- ============================================================================
-- 8. REALTIME PUBLICATIONS
-- ============================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_rooms_public;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.captain_connections;

-- Set REPLICA IDENTITY FULL for realtime to work properly with all columns
ALTER TABLE public.draft_rooms_public REPLICA IDENTITY FULL;
ALTER TABLE public.draft_room_players REPLICA IDENTITY FULL;
ALTER TABLE public.captain_connections REPLICA IDENTITY FULL;
