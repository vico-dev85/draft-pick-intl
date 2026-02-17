import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getSecureSessionId } from "@/lib/draftUtils";
import { ArrowLeft, Loader2, Crown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DraftRoom {
  id: string;
  draft_name: string;
  status: string;
  room_code: string;
}

interface RoomPlayer {
  room_id: string;
  id: string;
  player_id: string | null;
  is_captain: boolean;
  guest_name: string | null;
  claimed_by_session_id: string | null;
  pick_number: number | null;
  picked_by_captain_number: number | null;
  display_name: string;
  photo_url: string | null;
}

export default function JoinDraft() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation("draft");

  const [room, setRoom] = useState<DraftRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimedPlayerId, setClaimedPlayerId] = useState<string | null>(null);
  const [autoIdentifying, setAutoIdentifying] = useState(false);
  const [autoIdentifiedName, setAutoIdentifiedName] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string>("");
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  // Load sessionId on mount
  useEffect(() => {
    getSecureSessionId().then((id) => {
      setSessionId(id);
      console.log("Session ID loaded in JoinDraft:", id);
    });
  }, []);

  useEffect(() => {
    if (roomCode && sessionId) {
      fetchRoom();
    }
  }, [roomCode, sessionId]);

  // Auto-identify for logged-in linked members
  useEffect(() => {
    if (!authLoading && user && roomCode && sessionId && room && !claimedPlayerId && !autoIdentifying) {
      tryAutoIdentify();
    }
  }, [authLoading, user, roomCode, sessionId, room, claimedPlayerId]);

  const tryAutoIdentify = async () => {
    setAutoIdentifying(true);
    try {
      const { data, error } = await supabase.rpc("auto_identify_player", {
        p_room_code: roomCode?.toUpperCase() || "",
      });

      if (error) {
        console.log("Auto-identify RPC not available:", error.message);
        setAutoIdentifying(false);
        return;
      }

      const result = data as {
        found: boolean;
        already_claimed?: boolean;
        draft_room_player_id?: string;
        player_name?: string;
      } | null;

      if (result?.found && result.draft_room_player_id) {
        if (result.already_claimed) {
          // Player already claimed — check if it's our session
          const matchedPlayer = players.find(
            (p) => p.id === result.draft_room_player_id
          );
          if (matchedPlayer?.claimed_by_session_id === sessionId) {
            setClaimedPlayerId(result.draft_room_player_id);
          }
          setAutoIdentifying(false);
          return;
        }

        // Auto-claim this player
        setAutoIdentifiedName(result.player_name || null);
        await handleClaimPlayer(result.draft_room_player_id);
      }
    } catch (err) {
      console.error("Auto-identify error:", err);
    } finally {
      setAutoIdentifying(false);
    }
  };

  const fetchRoom = async () => {
    try {
      // Fetch room from public view (does not expose creator_user_id)
      const { data: roomData, error: roomError } = await supabase
        .from("draft_rooms_public")
        .select("*")
        .eq("room_code", roomCode?.toUpperCase())
        .single();

      if (roomError || !roomData) {
        toast({
          title: t("join.notFound"),
          description: t("join.checkCode"),
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setRoom(roomData);

      // Use public RPC to fetch players with names/photos (bypasses user_players RLS)
      const { data: playersData, error: playersError } = await supabase
        .rpc("get_room_players_public", { p_room_code: roomCode?.toUpperCase() });

      if (playersError) throw playersError;

      setPlayers(playersData || []);

      // Check if current session already claimed a player
      const claimed = playersData?.find(
        (p: RoomPlayer) => p.claimed_by_session_id === sessionId
      );
      if (claimed) {
        setClaimedPlayerId(claimed.id);
      }
    } catch (err) {
      console.error("Error fetching room:", err);
      toast({
        title: t("join.error"),
        description: t("join.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPlayer = async (draftRoomPlayerId: string) => {
    if (!sessionId) {
      toast({
        title: t("join.error"),
        description: t("join.sessionError"),
        variant: "destructive",
      });
      return;
    }

    setClaiming(draftRoomPlayerId);

    try {
      // Use secure RPC function to claim player identity with session validation
      const { data: claimResult, error: claimError } = await supabase
        .rpc("claim_player_identity", {
          p_draft_room_player_id: draftRoomPlayerId,
          p_session_id: sessionId,
        });

      if (claimError) throw claimError;

      const result = claimResult?.[0];
      if (!result?.success) {
        toast({
          title: t("join.cannotSelect"),
          description: result?.message === "Player already claimed"
            ? t("join.alreadyClaimed")
            : result?.message === "Session already claimed a player"
            ? t("join.sessionAlreadyClaimed")
            : t("join.selectAnother"),
          variant: "destructive",
        });
        fetchRoom(); // Refresh the list
        return;
      }

      setClaimedPlayerId(draftRoomPlayerId);

      // Note: We no longer call create_captain_connection here.
      // Presence API in WaitingRoom will handle captain connection tracking.

      toast({
        title: t("join.identitySelected"),
        description: t("join.connectedToRoom"),
      });

      // Navigate to waiting room
      navigate(`/room/${roomCode}`);
    } catch (err) {
      console.error("Error claiming player:", err);
      toast({
        title: t("join.error"),
        description: t("join.claimError"),
        variant: "destructive",
      });
    } finally {
      setClaiming(null);
    }
  };

  if (loading || autoIdentifying) {
    return (
      <div className="min-h-screen bg-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-3" />
          {autoIdentifying && autoIdentifiedName && (
            <p className="text-emerald-400 font-medium">
              {t("join.identifiedAs", { name: autoIdentifiedName })}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  // If already claimed, redirect to room
  if (claimedPlayerId) {
    return (
      <div className="min-h-screen bg-emerald-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Check className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            {t("join.alreadySelected")}
          </h2>
          <Button onClick={() => navigate(`/room/${roomCode}`)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {t("join.enterRoom")}
          </Button>
        </motion.div>
      </div>
    );
  }

  const captains = players.filter((p) => p.is_captain);
  const nonCaptains = players.filter((p) => !p.is_captain);

  return (
    <div className="min-h-screen relative overflow-hidden bg-emerald-900">
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)",
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
      {/* Debug Panel */}
      {isDebugMode && (
        <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm z-50 font-mono">
          <div className="font-bold mb-2 text-yellow-400">Debug Info (Join)</div>
          <div className="space-y-1">
            <div><span className="text-gray-400">Session ID:</span> {sessionId?.substring(0, 20) || 'loading...'}</div>
            <div><span className="text-gray-400">Room ID:</span> {room?.id.substring(0, 8)}...</div>
            <div><span className="text-gray-400">Room Code:</span> {room?.room_code}</div>
            <div><span className="text-gray-400">Claimed:</span> {claimedPlayerId ? 'Yes' : 'No'}</div>
            <div className="text-gray-400 mt-2">Available Players:</div>
            {players.slice(0, 3).map((p) => (
              <div key={p.id} className="ml-2 text-xs">
                - {p.display_name} ({p.is_captain ? 'Captain' : 'Player'})
                {p.claimed_by_session_id && ' - Claimed'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <Link
          to="/"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("join.back")}</span>
        </Link>
        <img src="/logo.png" alt="Draft Pick" className="h-8 w-auto" />
      </header>

      <main className="px-4 py-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 mb-4">
              <span className="text-sm text-white/60">{t("join.roomCode")}:</span>
              <span className="font-mono font-bold text-lg ml-2 text-white">
                {room.room_code}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {room.draft_name}
            </h1>
            <p className="text-white/60">{t("join.subtitle")}</p>
          </div>

          {/* Captains Section */}
          {captains.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                {t("join.captains")}
              </h2>
              <div className="grid gap-3">
                {captains.map((player) => {
                  const isClaimed = !!player.claimed_by_session_id;

                  return (
                    <button
                      key={player.id}
                      onClick={() => !isClaimed && handleClaimPlayer(player.id)}
                      disabled={isClaimed || claiming === player.id || !sessionId}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        isClaimed
                          ? "bg-white/5 border-white/10 opacity-60 cursor-not-allowed"
                          : "bg-black/30 backdrop-blur-sm border-amber-400/50 hover:border-amber-400 cursor-pointer"
                      }`}
                    >
                      <PlayerAvatar
                        name={player.display_name}
                        photoUrl={player.photo_url}
                        size="lg"
                      />
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-white">
                          {player.display_name}
                        </p>
                        <p className="text-sm text-amber-400">{t("join.captainLabel")}</p>
                      </div>
                      {claiming === player.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      ) : isClaimed ? (
                        <span className="text-sm text-white/40">
                          {t("join.claimed")}
                        </span>
                      ) : (
                        <span className="text-sm text-emerald-400">{t("join.select")}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Players Section */}
          {nonCaptains.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-white">{t("join.players")}</h2>
              <div className="grid grid-cols-2 gap-3">
                {nonCaptains.map((player) => {
                  const isClaimed = !!player.claimed_by_session_id;

                  return (
                    <button
                      key={player.id}
                      onClick={() => !isClaimed && handleClaimPlayer(player.id)}
                      disabled={isClaimed || claiming === player.id || !sessionId}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        isClaimed
                          ? "bg-white/5 border-white/10 opacity-60 cursor-not-allowed"
                          : "bg-black/30 backdrop-blur-sm border-white/20 hover:border-emerald-400 cursor-pointer"
                      }`}
                    >
                      <PlayerAvatar
                        name={player.display_name}
                        photoUrl={player.photo_url}
                        size="md"
                      />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm text-white truncate">
                          {player.display_name}
                        </p>
                      </div>
                      {claiming === player.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </main>
      </div>
    </div>
  );
}
