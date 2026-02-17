-- Table to store emoji reactions on draft results
CREATE TABLE IF NOT EXISTS public.draft_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.draft_rooms(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Each session can only react once per emoji per room
  UNIQUE(room_id, emoji, session_id)
);

-- Index for fast lookups
CREATE INDEX idx_draft_reactions_room_id ON public.draft_reactions(room_id);

-- Enable RLS
ALTER TABLE public.draft_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can read reactions (public results page)
CREATE POLICY "Anyone can read reactions"
  ON public.draft_reactions FOR SELECT
  USING (true);

-- Anyone can insert their own reaction
CREATE POLICY "Anyone can insert reactions"
  ON public.draft_reactions FOR INSERT
  WITH CHECK (true);

-- Anyone can delete their own reaction (by session_id)
CREATE POLICY "Anyone can delete own reactions"
  ON public.draft_reactions FOR DELETE
  USING (true);

-- RPC to get reaction counts for a room
CREATE OR REPLACE FUNCTION public.get_reaction_counts(p_room_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    jsonb_object_agg(emoji, count),
    '{}'::jsonb
  )
  FROM (
    SELECT emoji, COUNT(*) as count
    FROM public.draft_reactions
    WHERE room_id = p_room_id
    GROUP BY emoji
  ) counts;
$$;

-- RPC to toggle a reaction (add if not exists, remove if exists)
CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_room_id uuid,
  p_emoji text,
  p_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exists boolean;
  v_new_count integer;
BEGIN
  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM draft_reactions
    WHERE room_id = p_room_id
      AND emoji = p_emoji
      AND session_id = p_session_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove reaction
    DELETE FROM draft_reactions
    WHERE room_id = p_room_id
      AND emoji = p_emoji
      AND session_id = p_session_id;
  ELSE
    -- Add reaction
    INSERT INTO draft_reactions (room_id, emoji, session_id)
    VALUES (p_room_id, p_emoji, p_session_id);
  END IF;

  -- Get new count for this emoji
  SELECT COUNT(*) INTO v_new_count
  FROM draft_reactions
  WHERE room_id = p_room_id AND emoji = p_emoji;

  RETURN jsonb_build_object(
    'action', CASE WHEN v_exists THEN 'removed' ELSE 'added' END,
    'emoji', p_emoji,
    'count', v_new_count
  );
END;
$$;

-- RPC to get user's reactions for a room
CREATE OR REPLACE FUNCTION public.get_my_reactions(p_room_id uuid, p_session_id text)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(array_agg(emoji), ARRAY[]::text[])
  FROM public.draft_reactions
  WHERE room_id = p_room_id AND session_id = p_session_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_reaction_counts(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_reaction(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_reactions(uuid, text) TO anon, authenticated;
