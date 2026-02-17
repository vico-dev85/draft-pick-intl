-- Enable REPLICA IDENTITY FULL for captain_connections (already in publication)
ALTER TABLE public.captain_connections REPLICA IDENTITY FULL;

-- Enable REPLICA IDENTITY FULL for draft_rooms_public (already in publication)
ALTER TABLE public.draft_rooms_public REPLICA IDENTITY FULL;