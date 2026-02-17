-- RPC for anonymous quick draft creation.
-- Bypasses RLS and NOT NULL constraint on creator_user_id by using SECURITY DEFINER.
-- Accepts draft name, player names as JSON, and captain indices.
-- Returns the room code.

-- First, allow creator_user_id to be NULL for anonymous drafts
ALTER TABLE public.draft_rooms ALTER COLUMN creator_user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION create_quick_draft(
  p_draft_name TEXT,
  p_players JSONB,        -- array of {name: string, is_captain: boolean}
  p_raffle_order INTEGER[],
  p_draft_order JSONB
)
RETURNS TEXT  -- returns room_code
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room_code TEXT;
  v_room_id UUID;
  v_player JSONB;
  v_captain_names TEXT[] := ARRAY[]::TEXT[];
  v_captain_ids UUID[] := ARRAY[]::UUID[];
  v_inserted_id UUID;
  v_idx INTEGER;
BEGIN
  -- Generate a unique 4-char room code
  LOOP
    v_room_code := upper(substr(md5(random()::text), 1, 4));
    -- Replace confusing chars
    v_room_code := replace(v_room_code, '0', 'X');
    v_room_code := replace(v_room_code, 'O', 'Y');
    v_room_code := replace(v_room_code, 'I', 'Z');
    v_room_code := replace(v_room_code, '1', 'W');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM draft_rooms WHERE room_code = v_room_code);
  END LOOP;

  -- Create the draft room (anonymous — no creator_user_id)
  INSERT INTO draft_rooms (
    creator_user_id, draft_name, room_code, status,
    draft_order, raffle_order
  ) VALUES (
    NULL, p_draft_name, v_room_code, 'waiting',
    p_draft_order, p_raffle_order
  )
  RETURNING id INTO v_room_id;

  -- Insert all players
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    INSERT INTO draft_room_players (
      room_id, player_id, guest_name, is_captain, is_guest
    ) VALUES (
      v_room_id,
      NULL,
      v_player->>'name',
      (v_player->>'is_captain')::boolean,
      true
    )
    RETURNING id INTO v_inserted_id;

    -- Track captain IDs for updating draft_rooms
    IF (v_player->>'is_captain')::boolean THEN
      v_captain_names := array_append(v_captain_names, v_player->>'name');
      v_captain_ids := array_append(v_captain_ids, v_inserted_id);
    END IF;
  END LOOP;

  -- Update captain references on draft_rooms
  IF array_length(v_captain_ids, 1) >= 3 THEN
    UPDATE draft_rooms SET
      captain1_player_id = v_captain_ids[1],
      captain2_player_id = v_captain_ids[2],
      captain3_player_id = v_captain_ids[3]
    WHERE id = v_room_id;
  END IF;

  RETURN v_room_code;
END;
$$;

GRANT EXECUTE ON FUNCTION create_quick_draft(TEXT, JSONB, INTEGER[], JSONB) TO anon, authenticated;
