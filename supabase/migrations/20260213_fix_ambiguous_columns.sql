-- =====================================================
-- Fix: Ambiguous column references in RPCs
-- =====================================================
-- The RETURNS TABLE columns (id, user_id, club_id, etc.) clash with
-- table column names inside the function body. PostgreSQL cannot tell
-- if "id" means clubs.id or the function's output variable.
-- Fix: qualify all column references with table aliases.

-- 1. Fix get_club_players
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
    SELECT 1 FROM clubs c WHERE c.id = p_club_id AND c.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_players up2
    WHERE up2.club_id = p_club_id
      AND up2.linked_user_id = auth.uid()
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

-- 2. Fix get_club_drafts
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
    SELECT 1 FROM clubs c WHERE c.id = p_club_id AND c.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_players up
    WHERE up.club_id = p_club_id
      AND up.linked_user_id = auth.uid()
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
