-- Add logo_url column to clubs
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Update get_user_club to return logo_url
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
  v_club_id := ensure_user_club();

  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'default_location', default_location,
    'default_notes', default_notes,
    'whatsapp_invite_template', whatsapp_invite_template,
    'whatsapp_results_template', whatsapp_results_template,
    'logo_url', logo_url
  ) INTO v_club
  FROM clubs
  WHERE id = v_club_id;

  RETURN v_club;
END;
$$;

-- Update update_club_settings to accept logo_url
CREATE OR REPLACE FUNCTION public.update_club_settings(
  p_name text DEFAULT NULL,
  p_default_location text DEFAULT NULL,
  p_default_notes text DEFAULT NULL,
  p_whatsapp_invite_template text DEFAULT NULL,
  p_whatsapp_results_template text DEFAULT NULL,
  p_logo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_club_id uuid;
BEGIN
  SELECT id INTO v_club_id FROM clubs WHERE user_id = auth.uid();

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club not found';
  END IF;

  UPDATE clubs SET
    name = COALESCE(p_name, name),
    default_location = COALESCE(p_default_location, default_location),
    default_notes = COALESCE(p_default_notes, default_notes),
    whatsapp_invite_template = COALESCE(p_whatsapp_invite_template, whatsapp_invite_template),
    whatsapp_results_template = COALESCE(p_whatsapp_results_template, whatsapp_results_template),
    logo_url = COALESCE(p_logo_url, logo_url),
    updated_at = now()
  WHERE id = v_club_id;

  RETURN get_user_club();
END;
$$;

-- Re-grant permissions (function signature changed)
GRANT EXECUTE ON FUNCTION public.update_club_settings(text, text, text, text, text, text) TO authenticated;

-- Update get_my_linked_clubs to return club logo
CREATE OR REPLACE FUNCTION public.get_my_linked_clubs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'player_id', p.id,
        'player_name', p.name,
        'player_photo', p.photo_url,
        'club_id', c.id,
        'club_name', c.name,
        'club_logo_url', c.logo_url,
        'can_create_drafts', p.can_create_drafts,
        'can_send_invites', p.can_send_invites,
        'is_owner', c.user_id = auth.uid()
      )
    ), '[]'::jsonb)
    FROM user_players p
    JOIN clubs c ON c.id = p.club_id
    WHERE p.linked_user_id = auth.uid()
       OR c.user_id = auth.uid()
  );
END;
$$;
