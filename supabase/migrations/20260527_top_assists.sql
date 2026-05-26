-- Add top_assists to get_game_night_summary.
-- Mirrors the existing top_scorers block but counts assist_player_id.

CREATE OR REPLACE FUNCTION public.get_game_night_summary(p_night_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_night record;
  v_games jsonb;
  v_standings jsonb;
  v_top_scorers jsonb;
  v_top_assists jsonb;
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
        'minute', gg.minute,
        'is_own_goal', COALESCE(gg.is_own_goal, false),
        'assist_player_name', (
          SELECT up2.name FROM user_players up2 WHERE up2.id = gg.assist_player_id
        )
      ) ORDER BY gg.created_at)
      FROM game_goals gg LEFT JOIN user_players up ON gg.player_id = up.id
      WHERE gg.game_id = g.id
    ), '[]'::jsonb)
  ) ORDER BY g.game_number) INTO v_games FROM games g WHERE g.game_night_id = p_night_id;

  SELECT COUNT(*) INTO v_total_games FROM games WHERE game_night_id = p_night_id AND ended_at IS NOT NULL;
  SELECT COUNT(*) INTO v_total_goals FROM game_goals gg JOIN games g ON gg.game_id = g.id WHERE g.game_night_id = p_night_id;

  -- Top scorers (excludes own-goal credits since player_id is NULL for those)
  SELECT jsonb_agg(jsonb_build_object(
    'player_id', scorer.player_id, 'player_name', COALESCE(up.name, 'Unknown'),
    'player_photo', up.photo_url, 'goals', scorer.goal_count
  ) ORDER BY scorer.goal_count DESC) INTO v_top_scorers
  FROM (
    SELECT gg.player_id, COUNT(*) as goal_count
    FROM game_goals gg JOIN games g ON gg.game_id = g.id
    WHERE g.game_night_id = p_night_id
      AND gg.player_id IS NOT NULL
      AND COALESCE(gg.is_own_goal, false) = false
    GROUP BY gg.player_id
  ) scorer LEFT JOIN user_players up ON scorer.player_id = up.id;

  -- NEW: Top assists
  SELECT jsonb_agg(jsonb_build_object(
    'player_id', assister.player_id, 'player_name', COALESCE(up.name, 'Unknown'),
    'player_photo', up.photo_url, 'assists', assister.assist_count
  ) ORDER BY assister.assist_count DESC) INTO v_top_assists
  FROM (
    SELECT gg.assist_player_id as player_id, COUNT(*) as assist_count
    FROM game_goals gg JOIN games g ON gg.game_id = g.id
    WHERE g.game_night_id = p_night_id AND gg.assist_player_id IS NOT NULL
    GROUP BY gg.assist_player_id
  ) assister LEFT JOIN user_players up ON assister.player_id = up.id;

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
    'top_scorers', COALESCE(v_top_scorers, '[]'::jsonb),
    'top_assists', COALESCE(v_top_assists, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_game_night_summary(uuid) TO anon, authenticated;
