-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user_players table (player library)
CREATE TABLE public.user_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS on user_players
ALTER TABLE public.user_players ENABLE ROW LEVEL SECURITY;

-- User players policies
CREATE POLICY "Users can view their own players"
ON public.user_players FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own players"
ON public.user_players FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own players"
ON public.user_players FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own players"
ON public.user_players FOR DELETE
USING (auth.uid() = user_id);

-- Create draft_rooms table
CREATE TABLE public.draft_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_code TEXT UNIQUE NOT NULL,
  draft_name TEXT NOT NULL,
  captain1_player_id UUID REFERENCES public.user_players(id),
  captain2_player_id UUID REFERENCES public.user_players(id),
  captain3_player_id UUID REFERENCES public.user_players(id),
  draft_order JSONB,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'drafting', 'completed')),
  current_turn_captain_number INTEGER,
  current_pick_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on draft_rooms
ALTER TABLE public.draft_rooms ENABLE ROW LEVEL SECURITY;

-- Draft rooms policies
CREATE POLICY "Creators can manage their drafts"
ON public.draft_rooms FOR ALL
USING (auth.uid() = creator_user_id);

CREATE POLICY "Anyone can view drafts by room code"
ON public.draft_rooms FOR SELECT
USING (true);

-- Create draft_room_players table
CREATE TABLE public.draft_room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.draft_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.user_players(id),
  is_guest BOOLEAN DEFAULT FALSE,
  guest_name TEXT,
  is_captain BOOLEAN DEFAULT FALSE,
  claimed_by_session_id TEXT,
  picked_by_captain_number INTEGER,
  pick_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, pick_number)
);

-- Enable RLS on draft_room_players
ALTER TABLE public.draft_room_players ENABLE ROW LEVEL SECURITY;

-- Draft room players policies
CREATE POLICY "Anyone can view draft room players"
ON public.draft_room_players FOR SELECT
USING (true);

CREATE POLICY "Creators can manage draft room players"
ON public.draft_room_players FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.draft_rooms
    WHERE id = room_id AND creator_user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can claim identity"
ON public.draft_room_players FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create captain_connections table
CREATE TABLE public.captain_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.draft_rooms(id) ON DELETE CASCADE,
  captain_player_id UUID NOT NULL REFERENCES public.user_players(id),
  session_id TEXT NOT NULL,
  is_connected BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, captain_player_id)
);

-- Enable RLS on captain_connections
ALTER TABLE public.captain_connections ENABLE ROW LEVEL SECURITY;

-- Captain connections policies
CREATE POLICY "Anyone can view captain connections"
ON public.captain_connections FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert captain connections"
ON public.captain_connections FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update captain connections"
ON public.captain_connections FOR UPDATE
USING (true);

-- Create error_logs table
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  error JSONB NOT NULL,
  context JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on error_logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Error logs policy - anyone can insert for logging
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_draft_rooms_room_code ON public.draft_rooms(room_code);
CREATE INDEX idx_draft_rooms_creator ON public.draft_rooms(creator_user_id);
CREATE INDEX idx_draft_rooms_status ON public.draft_rooms(status);
CREATE INDEX idx_captain_connections_room ON public.captain_connections(room_id, is_connected);
CREATE INDEX idx_draft_room_players_room ON public.draft_room_players(room_id);
CREATE INDEX idx_error_logs_timestamp ON public.error_logs(timestamp DESC);

-- Create atomic pick function to prevent race conditions
CREATE OR REPLACE FUNCTION public.pick_player_atomic(
  p_room_id UUID,
  p_captain_number INTEGER,
  p_player_id UUID,
  p_pick_number INTEGER
)
RETURNS SETOF public.draft_room_players
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_draft_order JSONB;
  v_next_captain INTEGER;
  v_total_picks INTEGER;
BEGIN
  -- Lock the room to prevent concurrent picks
  SELECT draft_order INTO v_draft_order
  FROM public.draft_rooms 
  WHERE id = p_room_id 
  FOR UPDATE;
  
  -- Verify it's this captain's turn
  IF NOT EXISTS (
    SELECT 1 FROM public.draft_rooms 
    WHERE id = p_room_id 
    AND current_turn_captain_number = p_captain_number
    AND status = 'drafting'
  ) THEN
    RAISE EXCEPTION 'Not your turn or draft not active';
  END IF;
  
  -- Verify player hasn't been picked
  IF EXISTS (
    SELECT 1 FROM public.draft_room_players
    WHERE room_id = p_room_id
    AND id = p_player_id
    AND picked_by_captain_number IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Player already picked';
  END IF;
  
  -- Update the pick
  UPDATE public.draft_room_players
  SET 
    picked_by_captain_number = p_captain_number,
    pick_number = p_pick_number
  WHERE room_id = p_room_id 
  AND id = p_player_id
  AND picked_by_captain_number IS NULL;
  
  -- Calculate next captain (snake draft)
  SELECT COUNT(*) INTO v_total_picks
  FROM public.draft_room_players
  WHERE room_id = p_room_id
  AND picked_by_captain_number IS NOT NULL;
  
  -- Snake order: 1,2,3,3,2,1,1,2,3...
  DECLARE
    v_round INTEGER := (v_total_picks) / 3;
    v_pos_in_round INTEGER := (v_total_picks) % 3;
    v_is_even_round BOOLEAN := (v_round % 2 = 0);
  BEGIN
    IF v_is_even_round THEN
      v_next_captain := v_pos_in_round + 1;
    ELSE
      v_next_captain := 3 - v_pos_in_round;
    END IF;
  END;
  
  -- Check if draft is complete
  IF NOT EXISTS (
    SELECT 1 FROM public.draft_room_players
    WHERE room_id = p_room_id
    AND is_captain = FALSE
    AND picked_by_captain_number IS NULL
  ) THEN
    -- Draft complete
    UPDATE public.draft_rooms
    SET 
      status = 'completed',
      completed_at = now(),
      current_turn_captain_number = NULL,
      current_pick_number = p_pick_number
    WHERE id = p_room_id;
  ELSE
    -- Advance turn
    UPDATE public.draft_rooms
    SET 
      current_pick_number = p_pick_number + 1,
      current_turn_captain_number = v_next_captain
    WHERE id = p_room_id;
  END IF;
  
  RETURN QUERY 
  SELECT * FROM public.draft_room_players 
  WHERE id = p_player_id;
END;
$$;

-- Enable realtime for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.captain_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_rooms;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();