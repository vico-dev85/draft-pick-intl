-- =====================================================
-- Phase 3: Clubs, Settings, and Draft Enhancements
-- =====================================================

-- 1. Create clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text DEFAULT 'הקבוצה שלי',
  default_location text,
  default_notes text,

  -- WhatsApp message templates (owner can customize)
  whatsapp_invite_template text DEFAULT 'היי! הצטרפו לכוחות: {draft_name}
קוד: {room_code}
{link}',
  whatsapp_results_template text DEFAULT '🏆 תוצאות כוחות: {draft_name}

{teams}

📍 {location}
📝 {notes}

לצפייה בתוצאות: {link}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- MVP: 1 club per user
  UNIQUE(user_id)
);

-- 2. Add columns to draft_rooms
ALTER TABLE public.draft_rooms
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id);

-- 3. Add column to user_players for future player linking
ALTER TABLE public.user_players
  ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clubs_user_id ON public.clubs(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_rooms_club_id ON public.draft_rooms(club_id);
CREATE INDEX IF NOT EXISTS idx_user_players_club_id ON public.user_players(club_id);
CREATE INDEX IF NOT EXISTS idx_user_players_linked_user_id ON public.user_players(linked_user_id);

-- 5. Enable RLS on clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for clubs
CREATE POLICY "Users can view own club"
  ON public.clubs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own club"
  ON public.clubs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own club"
  ON public.clubs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own club"
  ON public.clubs FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Function to auto-create club on first login (called from app)
CREATE OR REPLACE FUNCTION public.ensure_user_club()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_club_id uuid;
BEGIN
  -- Check if user already has a club
  SELECT id INTO v_club_id FROM clubs WHERE user_id = auth.uid();

  -- If not, create one
  IF v_club_id IS NULL THEN
    INSERT INTO clubs (user_id)
    VALUES (auth.uid())
    RETURNING id INTO v_club_id;
  END IF;

  RETURN v_club_id;
END;
$$;

-- 8. Function to get or create user's club with all settings
CREATE OR REPLACE FUNCTION public.get_user_club()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_club_id uuid;
  v_club jsonb;
BEGIN
  -- Ensure club exists
  v_club_id := ensure_user_club();

  -- Return club data
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'default_location', default_location,
    'default_notes', default_notes,
    'whatsapp_invite_template', whatsapp_invite_template,
    'whatsapp_results_template', whatsapp_results_template
  ) INTO v_club
  FROM clubs
  WHERE id = v_club_id;

  RETURN v_club;
END;
$$;

-- 9. Function to update club settings
CREATE OR REPLACE FUNCTION public.update_club_settings(
  p_name text DEFAULT NULL,
  p_default_location text DEFAULT NULL,
  p_default_notes text DEFAULT NULL,
  p_whatsapp_invite_template text DEFAULT NULL,
  p_whatsapp_results_template text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_club_id uuid;
BEGIN
  -- Get user's club
  SELECT id INTO v_club_id FROM clubs WHERE user_id = auth.uid();

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club not found';
  END IF;

  -- Update only non-null fields
  UPDATE clubs SET
    name = COALESCE(p_name, name),
    default_location = COALESCE(p_default_location, default_location),
    default_notes = COALESCE(p_default_notes, default_notes),
    whatsapp_invite_template = COALESCE(p_whatsapp_invite_template, whatsapp_invite_template),
    whatsapp_results_template = COALESCE(p_whatsapp_results_template, whatsapp_results_template),
    updated_at = now()
  WHERE id = v_club_id;

  -- Return updated club
  RETURN get_user_club();
END;
$$;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_club() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_club() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_club_settings(text, text, text, text, text) TO authenticated;

-- 11. Migration: Create clubs for existing users who have drafts
INSERT INTO clubs (user_id)
SELECT DISTINCT creator_user_id
FROM draft_rooms
WHERE creator_user_id IS NOT NULL
  AND creator_user_id NOT IN (SELECT user_id FROM clubs)
ON CONFLICT (user_id) DO NOTHING;

-- 12. Migration: Link existing user_players to their clubs
UPDATE user_players
SET club_id = (
  SELECT id FROM clubs WHERE clubs.user_id = user_players.user_id
)
WHERE club_id IS NULL;

-- 13. Migration: Link existing draft_rooms to their clubs
UPDATE draft_rooms
SET club_id = (
  SELECT id FROM clubs WHERE clubs.user_id = draft_rooms.creator_user_id
)
WHERE club_id IS NULL AND creator_user_id IS NOT NULL;
