-- Allow deleting a player even if they have draft / game history.
-- Switches blocking foreign keys to ON DELETE SET NULL (preserves the
-- historical row, just nulls out the deleted player's reference).
--
-- IMPORTANT: cleans up any pre-existing orphaned references first,
-- otherwise the new FK fails to validate.

-- ── Step 1: NULL out orphaned references in existing data ─────────────
-- (data that already points to a deleted user_players row)

UPDATE public.draft_rooms
SET captain1_player_id = NULL
WHERE captain1_player_id IS NOT NULL
  AND captain1_player_id NOT IN (SELECT id FROM public.user_players);

UPDATE public.draft_rooms
SET captain2_player_id = NULL
WHERE captain2_player_id IS NOT NULL
  AND captain2_player_id NOT IN (SELECT id FROM public.user_players);

UPDATE public.draft_rooms
SET captain3_player_id = NULL
WHERE captain3_player_id IS NOT NULL
  AND captain3_player_id NOT IN (SELECT id FROM public.user_players);

UPDATE public.draft_rooms_public
SET captain1_player_id = NULL
WHERE captain1_player_id IS NOT NULL
  AND captain1_player_id NOT IN (SELECT id FROM public.user_players);

UPDATE public.draft_rooms_public
SET captain2_player_id = NULL
WHERE captain2_player_id IS NOT NULL
  AND captain2_player_id NOT IN (SELECT id FROM public.user_players);

UPDATE public.draft_rooms_public
SET captain3_player_id = NULL
WHERE captain3_player_id IS NOT NULL
  AND captain3_player_id NOT IN (SELECT id FROM public.user_players);

UPDATE public.draft_room_players
SET player_id = NULL
WHERE player_id IS NOT NULL
  AND player_id NOT IN (SELECT id FROM public.user_players);

DELETE FROM public.captain_connections
WHERE captain_player_id NOT IN (SELECT id FROM public.user_players);

-- ── Step 2: swap blocking FKs for ON DELETE SET NULL / CASCADE ────────

-- draft_rooms.captain1_player_id
ALTER TABLE public.draft_rooms
  DROP CONSTRAINT IF EXISTS draft_rooms_captain1_player_id_fkey;
ALTER TABLE public.draft_rooms
  ADD CONSTRAINT draft_rooms_captain1_player_id_fkey
  FOREIGN KEY (captain1_player_id) REFERENCES public.user_players(id) ON DELETE SET NULL;

-- draft_rooms.captain2_player_id
ALTER TABLE public.draft_rooms
  DROP CONSTRAINT IF EXISTS draft_rooms_captain2_player_id_fkey;
ALTER TABLE public.draft_rooms
  ADD CONSTRAINT draft_rooms_captain2_player_id_fkey
  FOREIGN KEY (captain2_player_id) REFERENCES public.user_players(id) ON DELETE SET NULL;

-- draft_rooms.captain3_player_id
ALTER TABLE public.draft_rooms
  DROP CONSTRAINT IF EXISTS draft_rooms_captain3_player_id_fkey;
ALTER TABLE public.draft_rooms
  ADD CONSTRAINT draft_rooms_captain3_player_id_fkey
  FOREIGN KEY (captain3_player_id) REFERENCES public.user_players(id) ON DELETE SET NULL;

-- draft_room_players.player_id
ALTER TABLE public.draft_room_players
  DROP CONSTRAINT IF EXISTS draft_room_players_player_id_fkey;
ALTER TABLE public.draft_room_players
  ADD CONSTRAINT draft_room_players_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES public.user_players(id) ON DELETE SET NULL;

-- captain_connections.captain_player_id (transient session — cascade is safe)
ALTER TABLE public.captain_connections
  DROP CONSTRAINT IF EXISTS captain_connections_captain_player_id_fkey;
ALTER TABLE public.captain_connections
  ADD CONSTRAINT captain_connections_captain_player_id_fkey
  FOREIGN KEY (captain_player_id) REFERENCES public.user_players(id) ON DELETE CASCADE;
