-- =====================================================
-- save_solo_draft: Persist solo draft results into
-- draft_rooms + draft_room_players so the Results page
-- can display them with full features (reactions, share
-- with link, game night, etc.)
-- =====================================================

CREATE OR REPLACE FUNCTION public.save_solo_draft(
  p_draft_name TEXT,
  p_club_id UUID,
  p_num_teams INTEGER,
  p_players JSONB  -- [{player_id, guest_name, team_number, pick_order}]
) RETURNS TEXT      -- room_code
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room_code TEXT;
  v_room_id UUID;
  v_player JSONB;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate a unique 4-char room code (same pattern as create_quick_draft)
  LOOP
    v_room_code := upper(substr(md5(random()::text), 1, 4));
    v_room_code := replace(v_room_code, '0', 'X');
    v_room_code := replace(v_room_code, 'O', 'Y');
    v_room_code := replace(v_room_code, 'I', 'Z');
    v_room_code := replace(v_room_code, '1', 'W');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM draft_rooms WHERE room_code = v_room_code);
  END LOOP;

  -- Insert draft room as completed (no captains, no draft order)
  INSERT INTO draft_rooms (
    creator_user_id, club_id, draft_name, room_code,
    status, completed_at, num_teams
  ) VALUES (
    auth.uid(), p_club_id, p_draft_name, v_room_code,
    'completed', now(), p_num_teams
  )
  RETURNING id INTO v_room_id;

  -- Insert all players
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    INSERT INTO draft_room_players (
      room_id,
      player_id,
      guest_name,
      is_captain,
      is_guest,
      picked_by_captain_number,
      pick_number
    ) VALUES (
      v_room_id,
      CASE WHEN v_player->>'player_id' IS NOT NULL AND v_player->>'player_id' != ''
           THEN (v_player->>'player_id')::uuid
           ELSE NULL
      END,
      CASE WHEN v_player->>'guest_name' IS NOT NULL AND v_player->>'guest_name' != ''
           THEN v_player->>'guest_name'
           ELSE NULL
      END,
      false,  -- no captains in solo draft
      CASE WHEN v_player->>'player_id' IS NOT NULL AND v_player->>'player_id' != ''
           THEN false
           ELSE true
      END,
      (v_player->>'team_number')::integer,
      (v_player->>'pick_order')::integer
    );
  END LOOP;

  RETURN v_room_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_solo_draft(TEXT, UUID, INTEGER, JSONB) TO authenticated;
