-- Add invite_requested_at column to user_players
ALTER TABLE public.user_players
  ADD COLUMN IF NOT EXISTS invite_requested_at TIMESTAMPTZ;

-- Anonymous RPC: let anyone request an invite for a specific player
CREATE OR REPLACE FUNCTION public.request_player_invite(p_player_id UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_player RECORD;
BEGIN
  SELECT * INTO v_player FROM user_players WHERE id = p_player_id;
  IF v_player IS NULL THEN RAISE EXCEPTION 'Player not found'; END IF;
  IF v_player.linked_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('already_linked', true);
  END IF;
  UPDATE user_players SET invite_requested_at = now() WHERE id = p_player_id;
  RETURN jsonb_build_object('success', true, 'player_name', v_player.name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_player_invite(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.request_player_invite(UUID) TO authenticated;
