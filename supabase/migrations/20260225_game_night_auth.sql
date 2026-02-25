-- =====================================================
-- Game Night: Add authorization checks to write RPCs
-- Only club members (owner or linked players) can control game nights
-- =====================================================

-- Helper: Check if current user is a member of a club
CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Club owner
  IF EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id AND user_id = auth.uid()) THEN
    RETURN true;
  END IF;

  -- Linked member: user_players.linked_user_id matches current user
  IF EXISTS (
    SELECT 1 FROM user_players up
    JOIN clubs c ON c.user_id = up.user_id
    WHERE c.id = p_club_id AND up.linked_user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- RPC 1: start_game_night — add auth check
CREATE OR REPLACE FUNCTION public.start_game_night(p_draft_room_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_night_id uuid;
  v_club_id uuid;
  v_existing_id uuid;
BEGIN
  -- Get club_id from draft room
  SELECT club_id INTO v_club_id FROM draft_rooms WHERE id = p_draft_room_id;

  -- Authorization: must be club member
  IF v_club_id IS NOT NULL AND NOT is_club_member(v_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT id INTO v_existing_id FROM game_nights
  WHERE draft_room_id = p_draft_room_id AND status != 'ended' LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_existing_id, 'already_existed', true);
  END IF;

  INSERT INTO game_nights (draft_room_id, club_id, status, started_at)
  VALUES (p_draft_room_id, v_club_id, 'active', now())
  RETURNING id INTO v_night_id;

  RETURN jsonb_build_object('id', v_night_id, 'already_existed', false);
END;
$$;

-- RPC 2: start_game — add auth check
-- Drop existing first: signature changed (had DEFAULT NULL on p_resting)
DROP FUNCTION IF EXISTS public.start_game(uuid, int, int, int);
CREATE OR REPLACE FUNCTION public.start_game(p_night_id uuid, p_team_a int, p_team_b int, p_resting int DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_game_id uuid;
  v_game_number int;
  v_club_id uuid;
BEGIN
  -- Authorization
  SELECT club_id INTO v_club_id FROM game_nights WHERE id = p_night_id;
  IF v_club_id IS NOT NULL AND NOT is_club_member(v_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT COALESCE(MAX(game_number), 0) + 1 INTO v_game_number
  FROM games WHERE game_night_id = p_night_id;

  INSERT INTO games (game_night_id, game_number, team_a_captain_number, team_b_captain_number, resting_captain_number, started_at, period)
  VALUES (p_night_id, v_game_number, p_team_a, p_team_b, p_resting, now(), 'regular')
  RETURNING id INTO v_game_id;

  UPDATE game_nights SET status = 'active' WHERE id = p_night_id;

  RETURN jsonb_build_object('id', v_game_id, 'game_number', v_game_number);
END;
$$;

-- RPC 3: record_goal — add auth check
CREATE OR REPLACE FUNCTION public.record_goal(p_game_id uuid, p_player_id uuid, p_team_captain_number int, p_minute int, p_period text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_goal_id uuid;
  v_new_score_a int;
  v_new_score_b int;
  v_team_a int;
  v_club_id uuid;
BEGIN
  -- Authorization: get club_id via game → game_night
  SELECT gn.club_id INTO v_club_id
  FROM games g JOIN game_nights gn ON g.game_night_id = gn.id
  WHERE g.id = p_game_id;
  IF v_club_id IS NOT NULL AND NOT is_club_member(v_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT team_a_captain_number INTO v_team_a FROM games WHERE id = p_game_id;

  INSERT INTO game_goals (game_id, player_id, team_captain_number, minute, period)
  VALUES (p_game_id, p_player_id, p_team_captain_number, p_minute, p_period)
  RETURNING id INTO v_goal_id;

  IF p_team_captain_number = v_team_a THEN
    UPDATE games SET score_a = score_a + 1 WHERE id = p_game_id
    RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  ELSE
    UPDATE games SET score_b = score_b + 1 WHERE id = p_game_id
    RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  END IF;

  RETURN jsonb_build_object('goal_id', v_goal_id, 'score_a', v_new_score_a, 'score_b', v_new_score_b);
END;
$$;

-- RPC 4: undo_last_goal — add auth check
CREATE OR REPLACE FUNCTION public.undo_last_goal(p_game_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_goal record;
  v_team_a int;
  v_club_id uuid;
BEGIN
  -- Authorization
  SELECT gn.club_id INTO v_club_id
  FROM games g JOIN game_nights gn ON g.game_night_id = gn.id
  WHERE g.id = p_game_id;
  IF v_club_id IS NOT NULL AND NOT is_club_member(v_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_goal FROM game_goals WHERE game_id = p_game_id ORDER BY created_at DESC LIMIT 1;
  IF v_goal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_goals');
  END IF;

  SELECT team_a_captain_number INTO v_team_a FROM games WHERE id = p_game_id;
  DELETE FROM game_goals WHERE id = v_goal.id;

  IF v_goal.team_captain_number = v_team_a THEN
    UPDATE games SET score_a = GREATEST(score_a - 1, 0) WHERE id = p_game_id;
  ELSE
    UPDATE games SET score_b = GREATEST(score_b - 1, 0) WHERE id = p_game_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'removed_goal_id', v_goal.id, 'removed_player_id', v_goal.player_id);
END;
$$;

-- RPC 5: end_game — add auth check
CREATE OR REPLACE FUNCTION public.end_game(p_game_id uuid, p_result text, p_penalty_score_a int DEFAULT NULL, p_penalty_score_b int DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_night_id uuid;
  v_club_id uuid;
BEGIN
  -- Authorization
  SELECT gn.club_id INTO v_club_id
  FROM games g JOIN game_nights gn ON g.game_night_id = gn.id
  WHERE g.id = p_game_id;
  IF v_club_id IS NOT NULL AND NOT is_club_member(v_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE games SET result = p_result, penalty_score_a = p_penalty_score_a, penalty_score_b = p_penalty_score_b, ended_at = now()
  WHERE id = p_game_id RETURNING game_night_id INTO v_night_id;

  UPDATE game_nights SET status = 'between_games' WHERE id = v_night_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC 6: end_game_night — add auth check
CREATE OR REPLACE FUNCTION public.end_game_night(p_night_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_club_id uuid;
BEGIN
  -- Authorization
  SELECT club_id INTO v_club_id FROM game_nights WHERE id = p_night_id;
  IF v_club_id IS NOT NULL AND NOT is_club_member(v_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE game_nights SET status = 'ended', ended_at = now() WHERE id = p_night_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant helper to authenticated
GRANT EXECUTE ON FUNCTION public.is_club_member(uuid) TO authenticated;
