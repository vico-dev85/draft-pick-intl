-- =====================================================
-- Fix NULL club_id on user_players
-- =====================================================
-- Some players added after the clubs migration don't have club_id set.
-- This causes members to not see the club's player pool.

-- Backfill club_id from the owner's club
UPDATE public.user_players
SET club_id = (
  SELECT id FROM public.clubs WHERE clubs.user_id = user_players.user_id
)
WHERE club_id IS NULL
  AND user_id IS NOT NULL;

-- Delete any auto-created empty clubs for members (users who have a linked_user_id
-- entry but also accidentally got their own club via get_user_club)
-- Only delete clubs that have NO players associated with them
DELETE FROM public.clubs
WHERE id NOT IN (
  SELECT DISTINCT club_id FROM public.user_players WHERE club_id IS NOT NULL
)
AND id NOT IN (
  SELECT DISTINCT club_id FROM public.draft_rooms WHERE club_id IS NOT NULL
);
