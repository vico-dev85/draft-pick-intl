-- =====================================================
-- Player Identity Linking & Categories
-- =====================================================

-- 1. Add player category (regular/occasional)
ALTER TABLE public.user_players
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'regular'
    CHECK (category IN ('regular', 'occasional'));

-- 2. Add permission columns for linked players
ALTER TABLE public.user_players
  ADD COLUMN IF NOT EXISTS can_create_drafts BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_send_invites BOOLEAN DEFAULT false;

-- 3. Add invite token columns
ALTER TABLE public.user_players
  ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

-- 4. Add created_by_user_id to draft_rooms (who actually pressed "create")
ALTER TABLE public.draft_rooms
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id);

-- 5. Index for invite token lookups
CREATE INDEX IF NOT EXISTS idx_user_players_invite_token ON public.user_players(invite_token)
  WHERE invite_token IS NOT NULL;

-- 6. Index for category filtering
CREATE INDEX IF NOT EXISTS idx_user_players_category ON public.user_players(user_id, category);

-- =====================================================
-- RLS Policies for Linked Players
-- =====================================================

-- 7. Allow linked players to view club players (read-only)
DROP POLICY IF EXISTS "Linked players can view club players" ON public.user_players;
CREATE POLICY "Linked players can view club players"
  ON public.user_players FOR SELECT
  USING (
    -- Owner can see their own players
    auth.uid() = user_id
    OR
    -- Linked player can see other players in their club
    club_id IN (
      SELECT club_id FROM user_players WHERE linked_user_id = auth.uid()
    )
  );

-- 8. Allow linked players to update their own record (photo only)
DROP POLICY IF EXISTS "Linked players can update own photo" ON public.user_players;
CREATE POLICY "Linked players can update own photo"
  ON public.user_players FOR UPDATE
  USING (linked_user_id = auth.uid())
  WITH CHECK (linked_user_id = auth.uid());

-- =====================================================
-- Functions for Invite Flow
-- =====================================================

-- 9. Generate invite token for a player
CREATE OR REPLACE FUNCTION public.generate_player_invite(p_player_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player RECORD;
  v_token UUID;
BEGIN
  -- Get player and verify ownership
  SELECT * INTO v_player FROM user_players WHERE id = p_player_id;

  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  -- Check if caller is owner OR has invite permission
  IF v_player.user_id != auth.uid() THEN
    -- Check if caller is a linked player with invite permission
    IF NOT EXISTS (
      SELECT 1 FROM user_players
      WHERE linked_user_id = auth.uid()
      AND club_id = v_player.club_id
      AND can_send_invites = true
    ) THEN
      RAISE EXCEPTION 'Permission denied';
    END IF;
  END IF;

  -- Check if already linked
  IF v_player.linked_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Player already linked to an account';
  END IF;

  -- Generate new token (expires in 48 hours)
  v_token := gen_random_uuid();

  UPDATE user_players
  SET invite_token = v_token,
      invite_expires_at = now() + interval '48 hours'
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'token', v_token,
    'player_name', v_player.name,
    'expires_at', now() + interval '48 hours'
  );
END;
$$;

-- 10. Accept invite and link account
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

  -- Link the player to current user
  UPDATE user_players
  SET linked_user_id = auth.uid(),
      invite_token = NULL,
      invite_expires_at = NULL
  WHERE id = v_player.id;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', v_player.id,
    'player_name', v_player.name,
    'club_name', v_player.club_name
  );
END;
$$;

-- 11. Unlink a player (owner or player themselves)
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

  -- Unlink and reset permissions
  UPDATE user_players
  SET linked_user_id = NULL,
      can_create_drafts = false,
      can_send_invites = false
  WHERE id = p_player_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 12. Update player permissions (owner only)
CREATE OR REPLACE FUNCTION public.update_player_permissions(
  p_player_id UUID,
  p_can_create_drafts BOOLEAN DEFAULT NULL,
  p_can_send_invites BOOLEAN DEFAULT NULL
)
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

  -- Only owner can update permissions
  IF v_player.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Can only set permissions for linked players
  IF v_player.linked_user_id IS NULL THEN
    RAISE EXCEPTION 'Player is not linked to any account';
  END IF;

  UPDATE user_players
  SET can_create_drafts = COALESCE(p_can_create_drafts, can_create_drafts),
      can_send_invites = COALESCE(p_can_send_invites, can_send_invites)
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'can_create_drafts', COALESCE(p_can_create_drafts, v_player.can_create_drafts),
    'can_send_invites', COALESCE(p_can_send_invites, v_player.can_send_invites)
  );
END;
$$;

-- 13. Update player category (owner only)
CREATE OR REPLACE FUNCTION public.update_player_category(
  p_player_id UUID,
  p_category TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player RECORD;
BEGIN
  -- Validate category
  IF p_category NOT IN ('regular', 'occasional') THEN
    RAISE EXCEPTION 'Invalid category. Must be regular or occasional';
  END IF;

  SELECT * INTO v_player FROM user_players WHERE id = p_player_id;

  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  -- Only owner can update category
  IF v_player.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE user_players
  SET category = p_category
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'category', p_category
  );
END;
$$;

-- 14. Get current user's linked player info (for dashboard)
CREATE OR REPLACE FUNCTION public.get_my_linked_clubs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'player_id', p.id,
        'player_name', p.name,
        'club_id', c.id,
        'club_name', c.name,
        'can_create_drafts', p.can_create_drafts,
        'can_send_invites', p.can_send_invites,
        'is_owner', c.user_id = auth.uid()
      )
    ), '[]'::jsonb)
    FROM user_players p
    JOIN clubs c ON c.id = p.club_id
    WHERE p.linked_user_id = auth.uid()
       OR c.user_id = auth.uid()
  );
END;
$$;

-- 15. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_player_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_player_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_player(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_player_permissions(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_player_category(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_linked_clubs() TO authenticated;

-- =====================================================
-- Migration: Set existing players to 'regular' category
-- =====================================================
UPDATE user_players SET category = 'regular' WHERE category IS NULL;
