-- =====================================================
-- Solo Draft presets: short codes that encode a player selection.
-- Used by the WhatsApp bot to generate pretty short URLs:
--   https://picknkick.com/#/solo-draft?s=ABCD
-- instead of stuffing 15 UUIDs into the URL.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.solo_draft_presets (
  code TEXT PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_ids UUID[] NOT NULL,
  num_teams INTEGER NOT NULL DEFAULT 3 CHECK (num_teams IN (2, 3)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_solo_draft_presets_expires_at
  ON public.solo_draft_presets (expires_at);

-- Anonymous-readable so the SoloDraftBoard page (which doesn't auth-check the
-- preset itself) can hydrate from a code. The code IS the secret; treat like
-- room codes.
ALTER TABLE public.solo_draft_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read solo presets by code" ON public.solo_draft_presets;
CREATE POLICY "Anyone can read solo presets by code"
  ON public.solo_draft_presets FOR SELECT
  USING (expires_at > now());

-- =====================================================
-- RPC: create_solo_preset — bot calls this with the selection
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_solo_preset(
  p_club_id UUID,
  p_player_ids UUID[],
  p_num_teams INTEGER DEFAULT 3
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF array_length(p_player_ids, 1) IS NULL OR array_length(p_player_ids, 1) < 2 THEN
    RAISE EXCEPTION 'player_ids must have at least 2 entries';
  END IF;
  IF p_num_teams NOT IN (2, 3) THEN
    RAISE EXCEPTION 'num_teams must be 2 or 3';
  END IF;

  -- Generate unique 4-char code, same style as draft room codes
  LOOP
    v_code := upper(substr(md5(random()::text), 1, 4));
    v_code := replace(v_code, '0', 'X');
    v_code := replace(v_code, 'O', 'Y');
    v_code := replace(v_code, 'I', 'Z');
    v_code := replace(v_code, '1', 'W');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM solo_draft_presets WHERE code = v_code AND expires_at > now()
    );
  END LOOP;

  INSERT INTO solo_draft_presets (code, club_id, player_ids, num_teams)
  VALUES (v_code, p_club_id, p_player_ids, p_num_teams);

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_solo_preset(UUID, UUID[], INTEGER) TO anon, authenticated;

-- =====================================================
-- RPC: get_solo_preset — FE calls this when it sees ?s=CODE
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_solo_preset(p_code TEXT)
RETURNS TABLE (
  player_ids UUID[],
  num_teams INTEGER,
  club_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT sdp.player_ids, sdp.num_teams, sdp.club_id
    FROM solo_draft_presets sdp
    WHERE sdp.code = upper(p_code)
      AND sdp.expires_at > now()
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_solo_preset(TEXT) TO anon, authenticated;
