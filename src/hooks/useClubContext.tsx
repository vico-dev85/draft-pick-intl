import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ClubLink {
  player_id: string;
  player_name: string;
  player_photo: string | null;
  club_id: string;
  club_name: string;
  club_logo_url: string | null;
  can_create_drafts: boolean;
  can_send_invites: boolean;
  is_owner: boolean;
}

interface ClubContext {
  /** The club the user belongs to (owner or linked member) */
  currentClub: { id: string; name: string; logo_url?: string | null } | null;
  /** True if the user owns this club */
  isOwner: boolean;
  /** True if the user is a linked member (not owner) */
  isMember: boolean;
  /** Permissions for linked members */
  permissions: {
    canCreateDrafts: boolean;
    canSendInvites: boolean;
  };
  /** The player record linked to this user (member only) */
  playerId: string | null;
  playerName: string | null;
  playerPhoto: string | null;
  /** Loading state */
  loading: boolean;
}

export function useClubContext(): ClubContext {
  const { user, loading: authLoading } = useAuth();
  const [clubLink, setClubLink] = useState<ClubLink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setClubLink(null);
      setLoading(false);
      return;
    }

    fetchClubContext();
  }, [user, authLoading]);

  const fetchClubContext = async () => {
    try {
      const { data, error } = await supabase.rpc("get_my_linked_clubs");

      if (error) throw error;

      const links = data as ClubLink[] | null;

      if (!links || links.length === 0) {
        // Check if user already owns a club
        const { data: ownedClub } = await supabase
          .from("clubs")
          .select("id, name, logo_url")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (ownedClub) {
          setClubLink({
            player_id: "",
            player_name: "",
            player_photo: null,
            club_id: ownedClub.id,
            club_name: ownedClub.name,
            club_logo_url: ownedClub.logo_url || null,
            can_create_drafts: true,
            can_send_invites: true,
            is_owner: true,
          });
          setLoading(false);
          return;
        }

        // Genuinely new user — auto-create club via get_user_club() RPC
        const { data: newClub, error: createError } = await supabase.rpc("get_user_club");
        if (!createError && newClub) {
          const club = newClub as { id: string; name: string };
          setClubLink({
            player_id: "",
            player_name: "",
            player_photo: null,
            club_id: club.id,
            club_name: club.name,
            club_logo_url: (club as { logo_url?: string }).logo_url || null,
            can_create_drafts: true,
            can_send_invites: true,
            is_owner: true,
          });
        }
        setLoading(false);
        return;
      }

      // Prefer owner link, fallback to first member link
      const ownerLink = links.find((l) => l.is_owner);
      const memberLink = links.find((l) => !l.is_owner);
      setClubLink(ownerLink || memberLink || null);
    } catch (err) {
      console.error("Error fetching club context:", err);
    } finally {
      setLoading(false);
    }
  };

  return useMemo<ClubContext>(() => {
    if (loading || authLoading) {
      return {
        currentClub: null,
        isOwner: false,
        isMember: false,
        permissions: { canCreateDrafts: false, canSendInvites: false },
        playerId: null,
        playerName: null,
        playerPhoto: null,
        loading: true,
      };
    }

    if (!clubLink) {
      return {
        currentClub: null,
        isOwner: false,
        isMember: false,
        permissions: { canCreateDrafts: false, canSendInvites: false },
        playerId: null,
        playerName: null,
        playerPhoto: null,
        loading: false,
      };
    }

    return {
      currentClub: { id: clubLink.club_id, name: clubLink.club_name, logo_url: clubLink.club_logo_url },
      isOwner: clubLink.is_owner,
      isMember: !clubLink.is_owner,
      permissions: {
        canCreateDrafts: clubLink.is_owner || clubLink.can_create_drafts,
        canSendInvites: clubLink.is_owner || clubLink.can_send_invites,
      },
      playerId: clubLink.is_owner ? null : clubLink.player_id,
      playerName: clubLink.is_owner ? null : clubLink.player_name,
      playerPhoto: clubLink.is_owner ? null : (clubLink.player_photo || null),
      loading: false,
    };
  }, [loading, authLoading, clubLink]);
}
