-- =====================================================
-- Fix: Default invite permission to false for new members
-- =====================================================
-- Owner should explicitly grant can_send_invites.
-- Only affects future invite acceptances; existing members keep current value.
-- can_create_drafts stays true by default (members need it for drafts).

-- 1. Change column default to false
ALTER TABLE public.user_players
  ALTER COLUMN can_send_invites SET DEFAULT false;

-- 2. Update accept_player_invite: can_send_invites = false
CREATE OR REPLACE FUNCTION public.accept_player_invite(p_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player RECORD;
  v_club RECORD;
BEGIN
  SELECT p.*, c.name as club_name, c.user_id as owner_id
  INTO v_player
  FROM user_players p
  LEFT JOIN clubs c ON c.id = p.club_id
  WHERE p.invite_token = p_token;

  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Invalid invite token';
  END IF;

  IF v_player.invite_expires_at < now() THEN
    UPDATE user_players
    SET invite_token = NULL, invite_expires_at = NULL
    WHERE id = v_player.id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  IF v_player.linked_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Player already linked to an account';
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_players
    WHERE linked_user_id = auth.uid()
    AND club_id = v_player.club_id
  ) THEN
    RAISE EXCEPTION 'You are already linked to a player in this club';
  END IF;

  -- Link player: can_create_drafts stays true, can_send_invites = false
  UPDATE user_players
  SET linked_user_id = auth.uid(),
      invite_token = NULL,
      invite_expires_at = NULL,
      can_create_drafts = true,
      can_send_invites = false
  WHERE id = v_player.id;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', v_player.id,
    'player_name', v_player.name,
    'club_name', v_player.club_name
  );
END;
$$;

-- 3. Update unlink_player: reset can_send_invites to false
CREATE OR REPLACE FUNCTION public.unlink_player(p_player_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player RECORD;
BEGIN
  SELECT * INTO v_player FROM user_players WHERE id = p_player_id;

  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF v_player.user_id != auth.uid() AND v_player.linked_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Unlink: can_create_drafts stays true, can_send_invites = false
  UPDATE user_players
  SET linked_user_id = NULL,
      can_create_drafts = true,
      can_send_invites = false
  WHERE id = p_player_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
