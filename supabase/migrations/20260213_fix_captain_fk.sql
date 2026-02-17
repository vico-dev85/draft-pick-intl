-- =====================================================
-- Fix: Drop FK constraints on captain player ID columns
-- =====================================================
-- captain1/2/3_player_id originally referenced user_players(id).
-- For quick drafts (no account), captains are in draft_room_players
-- (not user_players), so the FK blocks the insert with a 409 error.
-- Dropping the FKs allows both regular and quick draft captain IDs.

ALTER TABLE public.draft_rooms DROP CONSTRAINT IF EXISTS draft_rooms_captain1_player_id_fkey;
ALTER TABLE public.draft_rooms DROP CONSTRAINT IF EXISTS draft_rooms_captain2_player_id_fkey;
ALTER TABLE public.draft_rooms DROP CONSTRAINT IF EXISTS draft_rooms_captain3_player_id_fkey;
