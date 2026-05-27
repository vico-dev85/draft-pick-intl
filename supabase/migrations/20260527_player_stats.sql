-- Player stats + club leaderboards.
--
-- Two RPCs:
--   get_player_stats(p_player_id)      — one player's full stat sheet
--   get_club_leaderboards(p_club_id)   — top 5 scorers/assisters/success-rate
--                                        + club averages, for the dashboard

-- ──────────────────────────────────────────────────────────────────────
-- HELPER: resolve a player's team number within a given draft.
-- Picked players have draft_room_players.picked_by_captain_number set.
-- Captains have it null — we resolve them via the captains JSONB array
-- (1-indexed), with fallback to legacy captain1/2/3_player_id columns.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._player_team_in_draft(
  p_player_id uuid,
  p_room_id uuid
)
RETURNS int LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    -- picked players
    (SELECT picked_by_captain_number
       FROM public.draft_room_players
      WHERE room_id = p_room_id AND player_id = p_player_id
      LIMIT 1),
    -- captain in JSONB array
    (SELECT idx::int
       FROM public.draft_rooms dr,
            jsonb_array_elements_text(dr.captains)
              WITH ORDINALITY AS arr(uuid_text, idx)
      WHERE dr.id = p_room_id
        AND arr.uuid_text = p_player_id::text
      LIMIT 1),
    -- legacy captain columns
    (SELECT CASE
              WHEN captain1_player_id = p_player_id THEN 1
              WHEN captain2_player_id = p_player_id THEN 2
              WHEN captain3_player_id = p_player_id THEN 3
              ELSE NULL
            END
       FROM public.draft_rooms
      WHERE id = p_room_id)
  );
$$;


-- ──────────────────────────────────────────────────────────────────────
-- get_player_stats — one player's full stats card payload
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_player_stats(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_games_played int := 0;
  v_wins int := 0;
  v_draws int := 0;
  v_losses int := 0;
  v_points int;
  v_max_points int;
  v_goals int := 0;
  v_assists int := 0;
  v_best_night_goals int := 0;
  v_best_night_date timestamptz;
  v_recent_form jsonb;
  v_timeline jsonb;
BEGIN
  WITH games_with_team AS (
    SELECT
      g.id,
      g.game_night_id,
      g.result,
      g.ended_at,
      g.team_a_captain_number,
      g.team_b_captain_number,
      _player_team_in_draft(p_player_id, gn.draft_room_id) AS my_team
    FROM games g
    JOIN game_nights gn ON gn.id = g.game_night_id
    WHERE g.ended_at IS NOT NULL
      AND g.result IS NOT NULL
  ),
  played AS (
    SELECT *
    FROM games_with_team
    WHERE my_team IS NOT NULL
      AND my_team IN (team_a_captain_number, team_b_captain_number)
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE (result = 'team_a_win' AND my_team = team_a_captain_number)
         OR (result = 'team_b_win' AND my_team = team_b_captain_number)
    ),
    COUNT(*) FILTER (WHERE result = 'draw'),
    COUNT(*) FILTER (
      WHERE (result = 'team_a_win' AND my_team = team_b_captain_number)
         OR (result = 'team_b_win' AND my_team = team_a_captain_number)
    )
  INTO v_games_played, v_wins, v_draws, v_losses
  FROM played;

  v_points     := v_wins * 3 + v_draws;
  v_max_points := v_games_played * 3;

  SELECT COUNT(*) INTO v_goals
  FROM game_goals
  WHERE player_id = p_player_id AND COALESCE(is_own_goal, false) = false;

  SELECT COUNT(*) INTO v_assists
  FROM game_goals
  WHERE assist_player_id = p_player_id;

  SELECT goals, gn_date
  INTO v_best_night_goals, v_best_night_date
  FROM (
    SELECT
      gn.ended_at AS gn_date,
      COUNT(*) AS goals
    FROM game_goals gg
    JOIN games g ON g.id = gg.game_id
    JOIN game_nights gn ON gn.id = g.game_night_id
    WHERE gg.player_id = p_player_id
      AND COALESCE(gg.is_own_goal, false) = false
    GROUP BY g.game_night_id, gn.ended_at
    ORDER BY goals DESC, gn.ended_at DESC
    LIMIT 1
  ) sub;

  SELECT COALESCE(jsonb_agg(letter ORDER BY ended_at DESC), '[]'::jsonb)
  INTO v_recent_form
  FROM (
    SELECT
      g.ended_at,
      CASE
        WHEN g.result = 'draw' THEN 'D'
        WHEN (g.result = 'team_a_win' AND _player_team_in_draft(p_player_id, gn.draft_room_id) = g.team_a_captain_number)
          OR (g.result = 'team_b_win' AND _player_team_in_draft(p_player_id, gn.draft_room_id) = g.team_b_captain_number)
          THEN 'W'
        ELSE 'L'
      END AS letter
    FROM games g
    JOIN game_nights gn ON gn.id = g.game_night_id
    WHERE g.ended_at IS NOT NULL
      AND g.result IS NOT NULL
      AND _player_team_in_draft(p_player_id, gn.draft_room_id)
          IN (g.team_a_captain_number, g.team_b_captain_number)
    ORDER BY g.ended_at DESC
    LIMIT 5
  ) f;

  -- Timeline: one point per game night the player participated in, even
  -- if they didn't score or assist (a 0-goal night still matters for shape).
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'night_id', t.game_night_id,
             'date', t.gn_date,
             'goals', t.goals,
             'assists', t.assists
           ) ORDER BY t.gn_date ASC
         ), '[]'::jsonb)
  INTO v_timeline
  FROM (
    SELECT
      pn.game_night_id,
      pn.gn_date,
      COALESCE(stats.goals, 0) AS goals,
      COALESCE(stats.assists, 0) AS assists
    FROM (
      SELECT DISTINCT
        gn.id AS game_night_id,
        gn.ended_at AS gn_date
      FROM games g
      JOIN game_nights gn ON gn.id = g.game_night_id
      WHERE g.ended_at IS NOT NULL
        AND _player_team_in_draft(p_player_id, gn.draft_room_id)
            IN (g.team_a_captain_number, g.team_b_captain_number)
    ) pn
    LEFT JOIN (
      SELECT
        g.game_night_id,
        COUNT(*) FILTER (WHERE gg.player_id = p_player_id AND COALESCE(gg.is_own_goal, false) = false) AS goals,
        COUNT(*) FILTER (WHERE gg.assist_player_id = p_player_id) AS assists
      FROM game_goals gg
      JOIN games g ON g.id = gg.game_id
      WHERE gg.player_id = p_player_id OR gg.assist_player_id = p_player_id
      GROUP BY g.game_night_id
    ) stats ON stats.game_night_id = pn.game_night_id
  ) t;

  RETURN jsonb_build_object(
    'games_played', v_games_played,
    'wins', v_wins,
    'draws', v_draws,
    'losses', v_losses,
    'points', v_points,
    'max_points', v_max_points,
    'success_rate', CASE WHEN v_max_points > 0
                         THEN ROUND(v_points::numeric * 100 / v_max_points)
                         ELSE 0 END,
    'goals', v_goals,
    'assists', v_assists,
    'gpg', CASE WHEN v_games_played > 0
                THEN ROUND(v_goals::numeric / v_games_played, 2)
                ELSE 0 END,
    'apg', CASE WHEN v_games_played > 0
                THEN ROUND(v_assists::numeric / v_games_played, 2)
                ELSE 0 END,
    'best_night_goals', COALESCE(v_best_night_goals, 0),
    'best_night_date', v_best_night_date,
    'recent_form', v_recent_form,
    'timeline', v_timeline
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_stats(uuid) TO authenticated, anon;


-- ──────────────────────────────────────────────────────────────────────
-- get_club_leaderboards — top 5 + club averages for one club
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_club_leaderboards(p_club_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_top_scorers jsonb;
  v_top_assisters jsonb;
  v_top_success jsonb;
  v_avg_gpg numeric;
  v_avg_apg numeric;
  v_avg_sr numeric;
  v_qualifying_count int;
BEGIN
  -- Build per-player aggregates for everyone in this club who has played
  WITH club_players AS (
    SELECT id, name, photo_url
    FROM user_players
    WHERE club_id = p_club_id
  ),
  per_player_games AS (
    SELECT
      cp.id AS player_id,
      cp.name,
      cp.photo_url,
      g.id AS game_id,
      g.result,
      g.team_a_captain_number,
      g.team_b_captain_number,
      _player_team_in_draft(cp.id, gn.draft_room_id) AS my_team
    FROM club_players cp
    CROSS JOIN games g
    JOIN game_nights gn ON gn.id = g.game_night_id
    WHERE g.ended_at IS NOT NULL
      AND g.result IS NOT NULL
      AND gn.club_id = p_club_id
      AND _player_team_in_draft(cp.id, gn.draft_room_id)
          IN (g.team_a_captain_number, g.team_b_captain_number)
  ),
  per_player_record AS (
    SELECT
      player_id,
      MAX(name) AS name,
      MAX(photo_url) AS photo_url,
      COUNT(*) AS games_played,
      COUNT(*) FILTER (
        WHERE (result = 'team_a_win' AND my_team = team_a_captain_number)
           OR (result = 'team_b_win' AND my_team = team_b_captain_number)
      ) AS wins,
      COUNT(*) FILTER (WHERE result = 'draw') AS draws,
      COUNT(*) FILTER (
        WHERE (result = 'team_a_win' AND my_team = team_b_captain_number)
           OR (result = 'team_b_win' AND my_team = team_a_captain_number)
      ) AS losses
    FROM per_player_games
    GROUP BY player_id
  ),
  per_player_goals AS (
    SELECT
      gg.player_id,
      COUNT(*) FILTER (WHERE COALESCE(gg.is_own_goal, false) = false) AS goals,
      0 AS assists
    FROM game_goals gg
    JOIN games g ON g.id = gg.game_id
    JOIN game_nights gn ON gn.id = g.game_night_id
    WHERE gn.club_id = p_club_id
      AND gg.player_id IS NOT NULL
    GROUP BY gg.player_id

    UNION ALL

    SELECT
      gg.assist_player_id AS player_id,
      0 AS goals,
      COUNT(*) AS assists
    FROM game_goals gg
    JOIN games g ON g.id = gg.game_id
    JOIN game_nights gn ON gn.id = g.game_night_id
    WHERE gn.club_id = p_club_id
      AND gg.assist_player_id IS NOT NULL
    GROUP BY gg.assist_player_id
  ),
  per_player_combined AS (
    SELECT
      cp.id AS player_id,
      cp.name,
      cp.photo_url,
      COALESCE(rec.games_played, 0) AS games_played,
      COALESCE(rec.wins, 0) AS wins,
      COALESCE(rec.draws, 0) AS draws,
      COALESCE(rec.losses, 0) AS losses,
      COALESCE(rec.wins, 0) * 3 + COALESCE(rec.draws, 0) AS points,
      COALESCE(rec.games_played, 0) * 3 AS max_points,
      COALESCE(SUM(pg.goals), 0) AS goals,
      COALESCE(SUM(pg.assists), 0) AS assists
    FROM club_players cp
    LEFT JOIN per_player_record rec ON rec.player_id = cp.id
    LEFT JOIN per_player_goals pg ON pg.player_id = cp.id
    GROUP BY cp.id, cp.name, cp.photo_url, rec.games_played, rec.wins, rec.draws, rec.losses
  ),
  -- Adaptive minimum: as the club plays more games, the bar to qualify
  -- for the success-rate leaderboard rises. Keeps "100% in 3 games" players
  -- out of the rankings once a real history exists.
  -- Floor at 3 games to bootstrap brand-new clubs.
  --
  -- FUTURE: when this app scales, replace this threshold with Bayesian
  -- smoothing (pull each player's rate toward the club mean using a
  -- ~5-game prior). That's the "Reddit-comment-ranking" approach and is
  -- mathematically correct for rate-with-volume comparisons.
  min_games_calc AS (
    SELECT GREATEST(
      3,
      ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY games_played) * 0.33)
    )::int AS min_games
    FROM per_player_combined
    WHERE games_played > 0
  ),
  qualifying AS (
    SELECT pp.*
    FROM per_player_combined pp, min_games_calc m
    WHERE pp.games_played >= m.min_games
  )
  SELECT
    -- Top scorers (allow any player who has scored, no min games)
    (SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'player_id', player_id,
                'player_name', name,
                'player_photo', photo_url,
                'goals', goals
              ) ORDER BY goals DESC
            ), '[]'::jsonb)
     FROM (
       SELECT * FROM per_player_combined
       WHERE goals > 0
       ORDER BY goals DESC, name ASC
       LIMIT 5
     ) ts),

    (SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'player_id', player_id,
                'player_name', name,
                'player_photo', photo_url,
                'assists', assists
              ) ORDER BY assists DESC
            ), '[]'::jsonb)
     FROM (
       SELECT * FROM per_player_combined
       WHERE assists > 0
       ORDER BY assists DESC, name ASC
       LIMIT 5
     ) ta),

    -- Top success rate: min 3 games
    (SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'player_id', player_id,
                'player_name', name,
                'player_photo', photo_url,
                'success_rate', ROUND(points::numeric * 100 / NULLIF(max_points, 0)),
                'games_played', games_played
              ) ORDER BY (points::numeric / NULLIF(max_points, 0)) DESC
            ), '[]'::jsonb)
     FROM (
       SELECT * FROM qualifying
       ORDER BY (points::numeric / NULLIF(max_points, 0)) DESC, name ASC
       LIMIT 5
     ) tsr),

    -- Club averages — mean across qualifying players (adaptive minimum)
    (SELECT ROUND(AVG(goals::numeric / NULLIF(games_played, 0)), 2) FROM qualifying),
    (SELECT ROUND(AVG(assists::numeric / NULLIF(games_played, 0)), 2) FROM qualifying),
    (SELECT ROUND(AVG(points::numeric * 100 / NULLIF(max_points, 0))) FROM qualifying),
    (SELECT COUNT(*) FROM qualifying)
  INTO
    v_top_scorers, v_top_assisters, v_top_success,
    v_avg_gpg, v_avg_apg, v_avg_sr, v_qualifying_count
  FROM per_player_combined;

  RETURN jsonb_build_object(
    'top_scorers',    COALESCE(v_top_scorers, '[]'::jsonb),
    'top_assisters',  COALESCE(v_top_assisters, '[]'::jsonb),
    'top_success_rate', COALESCE(v_top_success, '[]'::jsonb),
    'club_avg_gpg',   COALESCE(v_avg_gpg, 0),
    'club_avg_apg',   COALESCE(v_avg_apg, 0),
    'club_avg_success_rate', COALESCE(v_avg_sr, 0),
    'qualifying_player_count', COALESCE(v_qualifying_count, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_leaderboards(uuid) TO authenticated, anon;
