-- Fix: get_club_players was missing invite_requested_at column
-- This caused the Players page to never see which players requested an invite,
-- even though the Dashboard badge count worked (via direct table query).
-- Must DROP first because changing RETURNS TABLE signature is not allowed.

DROP FUNCTION IF EXISTS public.get_club_players(UUID);

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
  invite_requested_at TIMESTAMPTZ,
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
    up.invite_requested_at,
    up.user_id,
    up.club_id
  FROM user_players up
  WHERE up.club_id = p_club_id
  ORDER BY
    -- Players who requested an invite come first
    (CASE WHEN up.invite_requested_at IS NOT NULL AND up.linked_user_id IS NULL THEN 0 ELSE 1 END),
    up.category,
    up.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_players(UUID) TO authenticated;
