-- =====================================================
-- Fix Default Permissions: grant abilities by default
-- =====================================================
-- Run AFTER: 20260209_player_identity_linking.sql

-- 1. Change column defaults to TRUE
ALTER TABLE public.user_players
  ALTER COLUMN can_create_drafts SET DEFAULT true;
ALTER TABLE public.user_players
  ALTER COLUMN can_send_invites SET DEFAULT true;

-- 2. Update existing players: set permissions to true for all
-- (Owner can later revoke via toggle)
UPDATE public.user_players
SET can_create_drafts = true,
    can_send_invites = true
WHERE can_create_drafts = false OR can_send_invites = false;

-- 3. Update accept_player_invite to grant permissions on link
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
  -- Find player by token
  SELECT p.*, c.name as club_name, c.user_id as owner_id
  INTO v_player
  FROM user_players p
  LEFT JOIN clubs c ON c.id = p.club_id
  WHERE p.invite_token = p_token;

  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Invalid invite token';
  END IF;

  -- Check expiration
  IF v_player.invite_expires_at < now() THEN
    -- Clear expired token
    UPDATE user_players
    SET invite_token = NULL, invite_expires_at = NULL
    WHERE id = v_player.id;

    RAISE EXCEPTION 'Invite has expired';
  END IF;

  -- Check if already linked
  IF v_player.linked_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Player already linked to an account';
  END IF;

  -- Check if user is already linked to another player in this club
  IF EXISTS (
    SELECT 1 FROM user_players
    WHERE linked_user_id = auth.uid()
    AND club_id = v_player.club_id
  ) THEN
    RAISE EXCEPTION 'You are already linked to a player in this club';
  END IF;

  -- Link the player to current user AND grant default permissions
  UPDATE user_players
  SET linked_user_id = auth.uid(),
      invite_token = NULL,
      invite_expires_at = NULL,
      can_create_drafts = true,
      can_send_invites = true
  WHERE id = v_player.id;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', v_player.id,
    'player_name', v_player.name,
    'club_name', v_player.club_name
  );
END;
$$;

-- 4. Update unlink_player to reset permissions to true (not false)
-- so if re-invited they start with permissions again
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

  -- Only owner or the linked user can unlink
  IF v_player.user_id != auth.uid() AND v_player.linked_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Unlink but keep default permissions (true) for next invite
  UPDATE user_players
  SET linked_user_id = NULL,
      can_create_drafts = true,
      can_send_invites = true
  WHERE id = p_player_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
