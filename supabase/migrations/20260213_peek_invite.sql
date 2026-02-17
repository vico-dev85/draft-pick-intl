-- Anonymous-safe RPC: returns only player name + club name for a valid invite token.
-- Used by AcceptInvite page to greet the user before they authenticate.
CREATE OR REPLACE FUNCTION peek_invite(p_token UUID)
RETURNS TABLE(player_name TEXT, club_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT up.name::TEXT, c.name::TEXT
  FROM user_players up
  JOIN clubs c ON c.id = up.club_id
  WHERE up.invite_token = p_token
    AND up.invite_expires_at > now()
    AND up.linked_user_id IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION peek_invite(UUID) TO anon, authenticated;
