-- =====================================================
-- Multi-Team Support: 2-N teams (currently UI supports 2-3)
-- Backward compatible with existing 3-team drafts
-- =====================================================

-- 1. Add new columns to draft_rooms
ALTER TABLE public.draft_rooms
  ADD COLUMN IF NOT EXISTS num_teams integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS captains jsonb; -- array of player_id strings

-- 2. Add new columns to draft_rooms_public (the public mirror)
ALTER TABLE public.draft_rooms_public
  ADD COLUMN IF NOT EXISTS num_teams integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS captains jsonb;

-- 3. Relax CHECK constraints to support more than 3 teams

-- draft_room_players.picked_by_captain_number: was IN (1,2,3)
ALTER TABLE public.draft_room_players
  DROP CONSTRAINT IF EXISTS draft_room_players_picked_by_captain_number_check;
ALTER TABLE public.draft_room_players
  ADD CONSTRAINT draft_room_players_picked_by_captain_number_check
  CHECK (picked_by_captain_number >= 1 AND picked_by_captain_number <= 10);

-- games.team_a_captain_number: was IN (1,2,3)
ALTER TABLE public.games
  DROP CONSTRAINT IF EXISTS games_team_a_captain_number_check;
ALTER TABLE public.games
  ADD CONSTRAINT games_team_a_captain_number_check
  CHECK (team_a_captain_number >= 1 AND team_a_captain_number <= 10);

-- games.team_b_captain_number: was IN (1,2,3)
ALTER TABLE public.games
  DROP CONSTRAINT IF EXISTS games_team_b_captain_number_check;
ALTER TABLE public.games
  ADD CONSTRAINT games_team_b_captain_number_check
  CHECK (team_b_captain_number >= 1 AND team_b_captain_number <= 10);

-- games.resting_captain_number: was NOT NULL + IN (1,2,3), make nullable for 2-team mode
ALTER TABLE public.games
  ALTER COLUMN resting_captain_number DROP NOT NULL;
ALTER TABLE public.games
  DROP CONSTRAINT IF EXISTS games_resting_captain_number_check;
ALTER TABLE public.games
  ADD CONSTRAINT games_resting_captain_number_check
  CHECK (resting_captain_number IS NULL OR (resting_captain_number >= 1 AND resting_captain_number <= 10));

-- Fix team distinctness checks to handle NULL resting
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_check;
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_check1;
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_check2;
ALTER TABLE public.games
  ADD CONSTRAINT games_teams_distinct CHECK (
    team_a_captain_number != team_b_captain_number
    AND (resting_captain_number IS NULL OR team_a_captain_number != resting_captain_number)
    AND (resting_captain_number IS NULL OR team_b_captain_number != resting_captain_number)
  );

-- game_goals.team_captain_number: was IN (1,2,3)
ALTER TABLE public.game_goals
  DROP CONSTRAINT IF EXISTS game_goals_team_captain_number_check;
ALTER TABLE public.game_goals
  ADD CONSTRAINT game_goals_team_captain_number_check
  CHECK (team_captain_number >= 1 AND team_captain_number <= 10);

-- =====================================================
-- 4. Update sync trigger to include new columns
-- =====================================================

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
    created_at, started_at, completed_at,
    num_teams, captains
  ) VALUES (
    NEW.id, NEW.room_code, NEW.draft_name,
    NEW.captain1_player_id, NEW.captain2_player_id, NEW.captain3_player_id,
    NEW.draft_order, NEW.status, NEW.current_turn_captain_number, NEW.current_pick_number,
    NEW.created_at, NEW.started_at, NEW.completed_at,
    NEW.num_teams, NEW.captains
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
    completed_at = EXCLUDED.completed_at,
    num_teams = EXCLUDED.num_teams,
    captains = EXCLUDED.captains;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 5. Update pick_player_atomic to support N teams
-- =====================================================

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
  v_num_teams integer;
  v_captains jsonb;
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

  -- Get room info including num_teams and captains
  SELECT COALESCE(num_teams, 3), captains
  INTO v_num_teams, v_captains
  FROM draft_rooms
  WHERE id = p_room_id;

  -- Resolve captain player_id: try captains JSONB first, then legacy columns
  IF v_captains IS NOT NULL AND jsonb_array_length(v_captains) >= p_captain_number THEN
    v_captain_player_id := (v_captains->>(p_captain_number - 1))::uuid;
  ELSE
    SELECT
      CASE p_captain_number
        WHEN 1 THEN captain1_player_id
        WHEN 2 THEN captain2_player_id
        WHEN 3 THEN captain3_player_id
      END
    INTO v_captain_player_id
    FROM draft_rooms
    WHERE id = p_room_id;
  END IF;

  IF v_captain_player_id IS NULL THEN
    RAISE EXCEPTION 'Invalid captain number or room';
  END IF;

  -- AUTHORIZATION CHECK: Verify session owns the captain via draft_room_players
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
    IF v_draft_order IS NOT NULL AND jsonb_array_length(v_draft_order) > 0 THEN
      v_next_captain := (v_draft_order->>((v_current_pick) % jsonb_array_length(v_draft_order)))::integer;
    END IF;

    -- Fallback: generic N-team snake pattern
    -- For N teams, the snake cycle is 2*N: [1..N, N..1]
    IF v_next_captain IS NULL OR v_next_captain < 1 OR v_next_captain > v_num_teams THEN
      DECLARE
        v_cycle_len integer := v_num_teams * 2;
        v_pos integer := v_current_pick % v_cycle_len;
      BEGIN
        IF v_pos < v_num_teams THEN
          v_next_captain := v_pos + 1;  -- Forward: 1, 2, 3, ...
        ELSE
          v_next_captain := v_cycle_len - v_pos;  -- Reverse: ..., 3, 2, 1
        END IF;
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

GRANT EXECUTE ON FUNCTION public.pick_player_atomic(uuid, integer, uuid, integer, text) TO anon, authenticated;

-- =====================================================
-- 6. Update start_draft_if_ready to use num_teams
-- =====================================================

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
  v_num_teams integer;
BEGIN
  -- Lock the room row
  SELECT status, draft_order, raffle_order, COALESCE(num_teams, 3)
  INTO v_status, v_draft_order, v_raffle_order, v_num_teams
  FROM draft_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'room_not_found');
  END IF;

  IF v_status = 'drafting' THEN
    RETURN jsonb_build_object('success', true, 'already_started', true);
  END IF;

  IF v_status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'draft_completed');
  END IF;

  -- Check if all captains are connected (use num_teams instead of hardcoded 3)
  SELECT COUNT(*)
  INTO v_connected_count
  FROM draft_room_players
  WHERE room_id = p_room_id
    AND is_captain = true
    AND claimed_by_session_id IS NOT NULL;

  IF v_connected_count < v_num_teams THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_all_captains_connected', 'connected', v_connected_count);
  END IF;

  -- Check if draft order exists
  IF v_draft_order IS NULL OR jsonb_array_length(v_draft_order) < v_num_teams THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_draft_order');
  END IF;

  v_first_captain := (v_draft_order->>0)::integer;

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

-- =====================================================
-- 7. Update create_quick_draft to support N teams
-- =====================================================

-- Drop old function signature first (different param count)
DROP FUNCTION IF EXISTS public.create_quick_draft(TEXT, JSONB, INTEGER[], JSONB);

CREATE OR REPLACE FUNCTION public.create_quick_draft(
  p_draft_name TEXT,
  p_players JSONB,
  p_raffle_order INTEGER[],
  p_draft_order JSONB,
  p_num_teams INTEGER DEFAULT 3
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room_code TEXT;
  v_room_id UUID;
  v_player JSONB;
  v_captain_ids UUID[] := ARRAY[]::UUID[];
  v_inserted_id UUID;
BEGIN
  -- Generate a unique 4-char room code
  LOOP
    v_room_code := upper(substr(md5(random()::text), 1, 4));
    v_room_code := replace(v_room_code, '0', 'X');
    v_room_code := replace(v_room_code, 'O', 'Y');
    v_room_code := replace(v_room_code, 'I', 'Z');
    v_room_code := replace(v_room_code, '1', 'W');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM draft_rooms WHERE room_code = v_room_code);
  END LOOP;

  -- Create the draft room (anonymous — no creator_user_id)
  INSERT INTO draft_rooms (
    creator_user_id, draft_name, room_code, status,
    draft_order, raffle_order, num_teams
  ) VALUES (
    NULL, p_draft_name, v_room_code, 'waiting',
    p_draft_order, p_raffle_order, p_num_teams
  )
  RETURNING id INTO v_room_id;

  -- Insert all players
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    INSERT INTO draft_room_players (
      room_id, player_id, guest_name, is_captain, is_guest
    ) VALUES (
      v_room_id, NULL, v_player->>'name',
      (v_player->>'is_captain')::boolean, true
    )
    RETURNING id INTO v_inserted_id;

    IF (v_player->>'is_captain')::boolean THEN
      v_captain_ids := array_append(v_captain_ids, v_inserted_id);
    END IF;
  END LOOP;

  -- Update captain references: legacy columns + new captains JSONB
  UPDATE draft_rooms SET
    captain1_player_id = CASE WHEN array_length(v_captain_ids, 1) >= 1 THEN v_captain_ids[1] ELSE NULL END,
    captain2_player_id = CASE WHEN array_length(v_captain_ids, 1) >= 2 THEN v_captain_ids[2] ELSE NULL END,
    captain3_player_id = CASE WHEN array_length(v_captain_ids, 1) >= 3 THEN v_captain_ids[3] ELSE NULL END,
    captains = to_jsonb(v_captain_ids)
  WHERE id = v_room_id;

  RETURN v_room_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_quick_draft(TEXT, JSONB, INTEGER[], JSONB, INTEGER) TO anon, authenticated;

-- =====================================================
-- 8. Update start_game to allow NULL resting
-- =====================================================

-- Drop old signature
DROP FUNCTION IF EXISTS public.start_game(uuid, int, int, int);

CREATE OR REPLACE FUNCTION public.start_game(
  p_night_id uuid,
  p_team_a int,
  p_team_b int,
  p_resting int DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_game_id uuid;
  v_game_number int;
BEGIN
  SELECT COALESCE(MAX(game_number), 0) + 1 INTO v_game_number
  FROM games WHERE game_night_id = p_night_id;

  INSERT INTO games (game_night_id, game_number, team_a_captain_number, team_b_captain_number, resting_captain_number, started_at, period)
  VALUES (p_night_id, v_game_number, p_team_a, p_team_b, p_resting, now(), 'regular')
  RETURNING id INTO v_game_id;

  UPDATE game_nights SET status = 'active' WHERE id = p_night_id;

  RETURN jsonb_build_object('id', v_game_id, 'game_number', v_game_number);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_game(uuid, int, int, int) TO authenticated;

-- =====================================================
-- 9. Update get_game_night_summary to include num_teams
--    and handle NULL resting + fix Hebrew fallback strings
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_game_night_summary(p_night_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_night record;
  v_games jsonb;
  v_standings jsonb;
  v_top_scorers jsonb;
  v_total_games int;
  v_total_goals int;
BEGIN
  SELECT gn.*, c.name as club_name, dr.draft_name, dr.location, dr.notes, dr.room_code,
         dr.captain1_player_id, dr.captain2_player_id, dr.captain3_player_id,
         COALESCE(dr.num_teams, 3) as num_teams, dr.captains
  INTO v_night
  FROM game_nights gn
  LEFT JOIN clubs c ON gn.club_id = c.id
  LEFT JOIN draft_rooms dr ON gn.draft_room_id = dr.id
  WHERE gn.id = p_night_id;

  IF v_night IS NULL THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', g.id, 'game_number', g.game_number,
    'team_a_captain_number', g.team_a_captain_number, 'team_b_captain_number', g.team_b_captain_number,
    'resting_captain_number', g.resting_captain_number,
    'score_a', g.score_a, 'score_b', g.score_b,
    'result', g.result, 'period', g.period,
    'penalty_score_a', g.penalty_score_a, 'penalty_score_b', g.penalty_score_b,
    'timer_start_at', g.timer_start_at, 'timer_paused_at', g.timer_paused_at,
    'timer_elapsed_before_pause', g.timer_elapsed_before_pause,
    'started_at', g.started_at, 'ended_at', g.ended_at,
    'goals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'player_name', COALESCE(up.name, 'Unknown'),
        'team_captain_number', gg.team_captain_number,
        'minute', gg.minute
      ) ORDER BY gg.created_at)
      FROM game_goals gg LEFT JOIN user_players up ON gg.player_id = up.id
      WHERE gg.game_id = g.id
    ), '[]'::jsonb)
  ) ORDER BY g.game_number) INTO v_games FROM games g WHERE g.game_night_id = p_night_id;

  SELECT COUNT(*) INTO v_total_games FROM games WHERE game_night_id = p_night_id AND ended_at IS NOT NULL;
  SELECT COUNT(*) INTO v_total_goals FROM game_goals gg JOIN games g ON gg.game_id = g.id WHERE g.game_night_id = p_night_id;

  SELECT jsonb_agg(jsonb_build_object(
    'player_id', scorer.player_id, 'player_name', COALESCE(up.name, 'Unknown'),
    'player_photo', up.photo_url, 'goals', scorer.goal_count
  ) ORDER BY scorer.goal_count DESC) INTO v_top_scorers
  FROM (
    SELECT gg.player_id, COUNT(*) as goal_count
    FROM game_goals gg JOIN games g ON gg.game_id = g.id
    WHERE g.game_night_id = p_night_id AND gg.player_id IS NOT NULL
    GROUP BY gg.player_id
  ) scorer LEFT JOIN user_players up ON scorer.player_id = up.id;

  SELECT jsonb_agg(jsonb_build_object(
    'captain_number', s.captain_number, 'wins', s.wins, 'draws', s.draws, 'losses', s.losses,
    'goals_for', s.goals_for, 'goals_against', s.goals_against, 'points', s.wins * 3 + s.draws
  ) ORDER BY (s.wins * 3 + s.draws) DESC, (s.goals_for - s.goals_against) DESC) INTO v_standings
  FROM (
    SELECT captain_number,
      SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN outcome = 'draw' THEN 1 ELSE 0 END) as draws,
      SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
      SUM(gf) as goals_for, SUM(ga) as goals_against
    FROM (
      SELECT team_a_captain_number as captain_number,
        CASE WHEN result = 'team_a_win' THEN 'win' WHEN result = 'team_b_win' THEN 'loss' WHEN result = 'draw' THEN 'draw' END as outcome,
        score_a as gf, score_b as ga
      FROM games WHERE game_night_id = p_night_id AND result IS NOT NULL
      UNION ALL
      SELECT team_b_captain_number as captain_number,
        CASE WHEN result = 'team_b_win' THEN 'win' WHEN result = 'team_a_win' THEN 'loss' WHEN result = 'draw' THEN 'draw' END as outcome,
        score_b as gf, score_a as ga
      FROM games WHERE game_night_id = p_night_id AND result IS NOT NULL
    ) game_results GROUP BY captain_number
  ) s;

  RETURN jsonb_build_object(
    'night_id', v_night.id, 'status', v_night.status,
    'started_at', v_night.started_at, 'ended_at', v_night.ended_at,
    'club_name', v_night.club_name, 'draft_name', v_night.draft_name,
    'location', v_night.location, 'notes', v_night.notes,
    'room_code', v_night.room_code,
    'captain1_player_id', v_night.captain1_player_id,
    'captain2_player_id', v_night.captain2_player_id,
    'captain3_player_id', v_night.captain3_player_id,
    'num_teams', v_night.num_teams,
    'captains', v_night.captains,
    'total_games', v_total_games, 'total_goals', v_total_goals,
    'games', COALESCE(v_games, '[]'::jsonb),
    'standings', COALESCE(v_standings, '[]'::jsonb),
    'top_scorers', COALESCE(v_top_scorers, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_night_summary(uuid) TO anon, authenticated;

-- Also fix get_room_players_public to use 'Player' instead of Hebrew fallback
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
    COALESCE(up.name, drp.guest_name, 'Player') AS display_name,
    up.photo_url
  FROM draft_room_players drp
  JOIN draft_rooms_public dr ON dr.id = drp.room_id
  LEFT JOIN user_players up ON up.id = drp.player_id
  WHERE dr.room_code = UPPER(p_room_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_players_public(text) TO anon, authenticated;
