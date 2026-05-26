-- =====================================================
-- Game Night iteration seed
-- =====================================================
-- Creates a completed draft (room_code = 'SEED') so you can jump
-- straight to /#/results/SEED, click "Start Game Night", and iterate.
--
-- Idempotent: re-running cleans up the previous SEED data first.
--
-- HOW TO USE:
--   1. Replace v_user_id below with your own auth.users id.
--      Find it: SELECT id, email FROM auth.users WHERE email = 'vico.pok@gmail.com';
--   2. Paste into Supabase Dashboard → SQL Editor → Run.
--   3. Open http://localhost:5173/#/results/SEED while logged in as that user.
-- =====================================================

DO $$
DECLARE
  -- >>> PASTE YOUR auth.users id HERE <<<
  v_user_id   uuid := '28e85c96-2b50-4fdb-a249-746aa4c35fc8';

  v_room_id   uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_cap1      uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  v_cap2      uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  v_cap3      uuid := 'bbbbbbbb-0000-0000-0000-000000000003';
  v_p1        uuid := 'cccccccc-0000-0000-0000-000000000001';
  v_p2        uuid := 'cccccccc-0000-0000-0000-000000000002';
  v_p3        uuid := 'cccccccc-0000-0000-0000-000000000003';
  v_p4        uuid := 'cccccccc-0000-0000-0000-000000000004';
  v_p5        uuid := 'cccccccc-0000-0000-0000-000000000005';
  v_p6        uuid := 'cccccccc-0000-0000-0000-000000000006';
  v_p7        uuid := 'cccccccc-0000-0000-0000-000000000007';
  v_p8        uuid := 'cccccccc-0000-0000-0000-000000000008';
  v_p9        uuid := 'cccccccc-0000-0000-0000-000000000009';
BEGIN
  -- Sanity check
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'v_user_id % not found in auth.users — paste your real id at top of file', v_user_id;
  END IF;

  -- Wipe prior seed (cascades to draft_room_players, game_nights, games, goals)
  DELETE FROM public.draft_rooms WHERE room_code = 'SEED';
  DELETE FROM public.user_players WHERE id IN (
    v_cap1, v_cap2, v_cap3, v_p1, v_p2, v_p3, v_p4, v_p5, v_p6, v_p7, v_p8, v_p9
  );

  -- 12 players (3 captains + 9 picks)
  INSERT INTO public.user_players (id, user_id, name) VALUES
    (v_cap1, v_user_id, 'Alex (C1)'),
    (v_cap2, v_user_id, 'Ben (C2)'),
    (v_cap3, v_user_id, 'Carlo (C3)'),
    (v_p1,   v_user_id, 'Diego'),
    (v_p2,   v_user_id, 'Eli'),
    (v_p3,   v_user_id, 'Felix'),
    (v_p4,   v_user_id, 'Gabriel'),
    (v_p5,   v_user_id, 'Hugo'),
    (v_p6,   v_user_id, 'Ivan'),
    (v_p7,   v_user_id, 'Jonah'),
    (v_p8,   v_user_id, 'Kai'),
    (v_p9,   v_user_id, 'Leo');

  -- Completed draft room
  INSERT INTO public.draft_rooms (
    id, creator_user_id, draft_name, room_code, status,
    captain1_player_id, captain2_player_id, captain3_player_id,
    captains, num_teams,
    started_at, completed_at
  ) VALUES (
    v_room_id, v_user_id, 'Game Night Seed', 'SEED', 'completed',
    v_cap1, v_cap2, v_cap3,
    jsonb_build_array(v_cap1::text, v_cap2::text, v_cap3::text), 3,
    now() - interval '30 min', now() - interval '5 min'
  );

  -- Captains in the room (no picked_by_captain_number — they aren't picks)
  INSERT INTO public.draft_room_players (room_id, player_id, is_captain) VALUES
    (v_room_id, v_cap1, true),
    (v_room_id, v_cap2, true),
    (v_room_id, v_cap3, true);

  -- 9 snake-draft picks: C1, C2, C3, C3, C2, C1, C1, C2, C3
  INSERT INTO public.draft_room_players (room_id, player_id, picked_by_captain_number, pick_number) VALUES
    (v_room_id, v_p1, 1, 1),
    (v_room_id, v_p2, 2, 2),
    (v_room_id, v_p3, 3, 3),
    (v_room_id, v_p4, 3, 4),
    (v_room_id, v_p5, 2, 5),
    (v_room_id, v_p6, 1, 6),
    (v_room_id, v_p7, 1, 7),
    (v_room_id, v_p8, 2, 8),
    (v_room_id, v_p9, 3, 9);

  RAISE NOTICE 'Seed ready. Open: http://localhost:5173/#/results/SEED';
END $$;
