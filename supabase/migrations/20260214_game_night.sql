-- =====================================================
-- Game Night: Live game manager after draft
-- =====================================================

-- 1. game_nights table
CREATE TABLE IF NOT EXISTS public.game_nights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_room_id uuid NOT NULL REFERENCES public.draft_rooms(id) ON DELETE CASCADE,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'between_games', 'ended')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX idx_game_nights_draft_room_id ON public.game_nights(draft_room_id);
CREATE INDEX idx_game_nights_club_id ON public.game_nights(club_id);

-- 2. games table
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_night_id uuid NOT NULL REFERENCES public.game_nights(id) ON DELETE CASCADE,
  game_number int NOT NULL,
  team_a_captain_number int NOT NULL CHECK (team_a_captain_number IN (1, 2, 3)),
  team_b_captain_number int NOT NULL CHECK (team_b_captain_number IN (1, 2, 3)),
  resting_captain_number int NOT NULL CHECK (resting_captain_number IN (1, 2, 3)),
  score_a int NOT NULL DEFAULT 0,
  score_b int NOT NULL DEFAULT 0,
  timer_start_at timestamptz,
  timer_paused_at timestamptz,
  timer_elapsed_before_pause int NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'regular' CHECK (period IN ('regular', 'extra_time', 'penalties')),
  result text CHECK (result IN ('team_a_win', 'team_b_win', 'draw')),
  penalty_score_a int,
  penalty_score_b int,
  started_at timestamptz,
  ended_at timestamptz,
  UNIQUE(game_night_id, game_number),
  CHECK (team_a_captain_number != team_b_captain_number),
  CHECK (team_a_captain_number != resting_captain_number),
  CHECK (team_b_captain_number != resting_captain_number)
);

CREATE INDEX idx_games_game_night_id ON public.games(game_night_id);

-- 3. game_goals table
CREATE TABLE IF NOT EXISTS public.game_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.user_players(id) ON DELETE SET NULL,
  team_captain_number int NOT NULL CHECK (team_captain_number IN (1, 2, 3)),
  minute int,
  period text NOT NULL DEFAULT 'regular' CHECK (period IN ('regular', 'extra_time')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_game_goals_game_id ON public.game_goals(game_id);
CREATE INDEX idx_game_goals_player_id ON public.game_goals(player_id);

-- 4. Enable RLS
ALTER TABLE public.game_nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_goals ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies: public read, authenticated write
CREATE POLICY "Anyone can read game nights" ON public.game_nights FOR SELECT USING (true);
CREATE POLICY "Anyone can read games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Anyone can read game goals" ON public.game_goals FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert game nights" ON public.game_nights FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update game nights" ON public.game_nights FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert games" ON public.games FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update games" ON public.games FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert goals" ON public.game_goals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete goals" ON public.game_goals FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RPCs
-- =====================================================

-- RPC 1: start_game_night (idempotent)
CREATE OR REPLACE FUNCTION public.start_game_night(p_draft_room_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_night_id uuid;
  v_club_id uuid;
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_existing_id FROM game_nights
  WHERE draft_room_id = p_draft_room_id AND status != 'ended' LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('id', v_existing_id, 'already_existed', true);
  END IF;

  SELECT club_id INTO v_club_id FROM draft_rooms WHERE id = p_draft_room_id;

  INSERT INTO game_nights (draft_room_id, club_id, status, started_at)
  VALUES (p_draft_room_id, v_club_id, 'active', now())
  RETURNING id INTO v_night_id;

  RETURN jsonb_build_object('id', v_night_id, 'already_existed', false);
END;
$$;

-- RPC 2: start_game
CREATE OR REPLACE FUNCTION public.start_game(p_night_id uuid, p_team_a int, p_team_b int, p_resting int)
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

-- RPC 3: record_goal (atomically inserts goal + updates score)
CREATE OR REPLACE FUNCTION public.record_goal(p_game_id uuid, p_player_id uuid, p_team_captain_number int, p_minute int, p_period text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_goal_id uuid;
  v_new_score_a int;
  v_new_score_b int;
  v_team_a int;
BEGIN
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

-- RPC 4: undo_last_goal
CREATE OR REPLACE FUNCTION public.undo_last_goal(p_game_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_goal record;
  v_team_a int;
BEGIN
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

-- RPC 5: end_game
CREATE OR REPLACE FUNCTION public.end_game(p_game_id uuid, p_result text, p_penalty_score_a int DEFAULT NULL, p_penalty_score_b int DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_night_id uuid;
BEGIN
  UPDATE games SET result = p_result, penalty_score_a = p_penalty_score_a, penalty_score_b = p_penalty_score_b, ended_at = now()
  WHERE id = p_game_id RETURNING game_night_id INTO v_night_id;

  UPDATE game_nights SET status = 'between_games' WHERE id = v_night_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC 6: end_game_night
CREATE OR REPLACE FUNCTION public.end_game_night(p_night_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE game_nights SET status = 'ended', ended_at = now() WHERE id = p_night_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC 7: get_game_night_summary
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
  v_room_code text;
BEGIN
  SELECT gn.*, c.name as club_name, dr.draft_name, dr.location, dr.notes, dr.room_code,
         dr.captain1_player_id, dr.captain2_player_id, dr.captain3_player_id
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
        'player_name', COALESCE(up.name, 'לא ידוע'),
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
    'player_id', scorer.player_id, 'player_name', COALESCE(up.name, 'אלמוני'),
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
    'total_games', v_total_games, 'total_goals', v_total_goals,
    'games', COALESCE(v_games, '[]'::jsonb),
    'standings', COALESCE(v_standings, '[]'::jsonb),
    'top_scorers', COALESCE(v_top_scorers, '[]'::jsonb)
  );
END;
$$;

-- RPC 8: get_game_night_public (alias)
CREATE OR REPLACE FUNCTION public.get_game_night_public(p_night_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.get_game_night_summary(p_night_id); $$;

-- RPC 9: find_game_night_by_draft
CREATE OR REPLACE FUNCTION public.find_game_night_by_draft(p_draft_room_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('id', id, 'status', status, 'started_at', started_at, 'ended_at', ended_at)
  FROM game_nights WHERE draft_room_id = p_draft_room_id ORDER BY started_at DESC LIMIT 1;
$$;

-- Grant execution
GRANT EXECUTE ON FUNCTION public.start_game_night(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_game(uuid, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_goal(uuid, uuid, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_last_goal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_game(uuid, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_game_night(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_night_summary(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_game_night_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_game_night_by_draft(uuid) TO anon, authenticated;
