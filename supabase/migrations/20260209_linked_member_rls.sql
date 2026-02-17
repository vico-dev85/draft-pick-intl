-- =====================================================
-- Linked Member Access: RPCs + RLS Updates
-- =====================================================
-- Run AFTER: 20260209_player_identity_linking.sql
--            20260209_fix_user_players_rls.sql

-- 1. get_club_players(club_id) — returns club players for owners + linked members
CREATE OR REPLACE FUNCTION public.get_club_players(p_club_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  photo_url TEXT,
  category TEXT,
  linked_user_id UUID,
  can_create_drafts BOOLEAN,
  can_send_invites BOOLEAN,
  invite_token UUID,
  invite_expires_at TIMESTAMPTZ,
  user_id UUID,
  club_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is owner or a linked member of this club
  IF NOT EXISTS (
    SELECT 1 FROM clubs WHERE id = p_club_id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_players
    WHERE user_players.club_id = p_club_id
      AND user_players.linked_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.name,
    up.photo_url,
    up.category,
    up.linked_user_id,
    up.can_create_drafts,
    up.can_send_invites,
    up.invite_token,
    up.invite_expires_at,
    up.user_id,
    up.club_id
  FROM user_players up
  WHERE up.club_id = p_club_id
  ORDER BY up.category, up.name;
END;
$$;

-- 2. get_club_drafts(club_id) — returns club drafts for owners + linked members
CREATE OR REPLACE FUNCTION public.get_club_drafts(p_club_id UUID)
RETURNS TABLE (
  id UUID,
  draft_name TEXT,
  created_at TIMESTAMPTZ,
  status TEXT,
  room_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is owner or a linked member of this club
  IF NOT EXISTS (
    SELECT 1 FROM clubs WHERE id = p_club_id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_players
    WHERE user_players.club_id = p_club_id
      AND user_players.linked_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    dr.id,
    dr.draft_name,
    dr.created_at,
    dr.status,
    dr.room_code
  FROM draft_rooms dr
  WHERE dr.club_id = p_club_id
  ORDER BY dr.created_at DESC
  LIMIT 20;
END;
$$;

-- 3. auto_identify_player(room_code) — checks if logged-in user matches a player via linked_user_id
CREATE OR REPLACE FUNCTION public.auto_identify_player(p_room_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room RECORD;
  v_match RECORD;
BEGIN
  -- Find the room
  SELECT * INTO v_room FROM draft_rooms WHERE room_code = upper(p_room_code);

  IF v_room IS NULL THEN
    RETURN jsonb_build_object('found', false, 'reason', 'room_not_found');
  END IF;

  -- Find a draft_room_player whose linked club player matches the current user
  SELECT drp.id AS draft_room_player_id, drp.claimed_by_session_id,
         COALESCE(up.name, drp.guest_name) AS player_name
  INTO v_match
  FROM draft_room_players drp
  LEFT JOIN user_players up ON up.id = drp.player_id
  WHERE drp.room_id = v_room.id
    AND up.linked_user_id = auth.uid();

  IF v_match IS NULL THEN
    RETURN jsonb_build_object('found', false, 'reason', 'no_linked_player');
  END IF;

  -- Already claimed by someone else?
  IF v_match.claimed_by_session_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found', true,
      'already_claimed', true,
      'draft_room_player_id', v_match.draft_room_player_id,
      'player_name', v_match.player_name
    );
  END IF;

  -- Return the unclaimed match — the client will call claim_player_identity
  RETURN jsonb_build_object(
    'found', true,
    'already_claimed', false,
    'draft_room_player_id', v_match.draft_room_player_id,
    'player_name', v_match.player_name
  );
END;
$$;

-- 4. Update get_my_linked_clubs() to include player_photo
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
        'player_photo', p.photo_url,
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

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_club_players(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_drafts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_identify_player(TEXT) TO authenticated;
