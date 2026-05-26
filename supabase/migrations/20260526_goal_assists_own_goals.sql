-- Add assist tracking + own-goal flag to game_goals,
-- and update record_goal RPC to accept the new params.

ALTER TABLE public.game_goals
  ADD COLUMN IF NOT EXISTS assist_player_id uuid REFERENCES public.user_players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_own_goal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_game_goals_assist_player_id
  ON public.game_goals(assist_player_id);

-- Updated record_goal: accepts optional assist + own-goal info.
-- For own goals, p_player_id should be NULL (no scorer credited).
CREATE OR REPLACE FUNCTION public.record_goal(
  p_game_id uuid,
  p_player_id uuid,
  p_team_captain_number int,
  p_minute int,
  p_period text,
  p_assist_player_id uuid DEFAULT NULL,
  p_is_own_goal boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_goal_id uuid;
  v_new_score_a int;
  v_new_score_b int;
  v_team_a int;
BEGIN
  SELECT team_a_captain_number INTO v_team_a FROM games WHERE id = p_game_id;

  INSERT INTO game_goals (
    game_id, player_id, team_captain_number, minute, period,
    assist_player_id, is_own_goal
  )
  VALUES (
    p_game_id, p_player_id, p_team_captain_number, p_minute, p_period,
    p_assist_player_id, COALESCE(p_is_own_goal, false)
  )
  RETURNING id INTO v_goal_id;

  IF p_team_captain_number = v_team_a THEN
    UPDATE games SET score_a = score_a + 1 WHERE id = p_game_id
    RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  ELSE
    UPDATE games SET score_b = score_b + 1 WHERE id = p_game_id
    RETURNING score_a, score_b INTO v_new_score_a, v_new_score_b;
  END IF;

  RETURN jsonb_build_object(
    'goal_id', v_goal_id,
    'score_a', v_new_score_a,
    'score_b', v_new_score_b
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_goal(uuid, uuid, int, int, text, uuid, boolean) TO authenticated;
