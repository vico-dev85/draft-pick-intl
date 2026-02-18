import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCaptainColor, getCaptainLabel, getSecureSessionId, getTeamGridClass } from "@/lib/draftUtils";
import { getCaptainPlayerId, getNumTeams, getAllCaptains } from "@/lib/captainHelpers";
import {
  Loader2,
  Crown,
  Share2,
  Trophy,
  Home,
  MessageCircle,
  MapPin,
  FileText,
  RefreshCw,
  Users,
  X,
  Check,
  Timer,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClubContext } from "@/hooks/useClubContext";
import { InstallPromptBanner } from "@/components/InstallPromptBanner";
import { useTranslation } from "react-i18next";

// Emoji reactions visitors can give
const REACTION_EMOJIS = [
  { emoji: "👍", labelKey: "reactions.loved" },
  { emoji: "🔥", labelKey: "reactions.fire" },
  { emoji: "😂", labelKey: "reactions.laughing" },
  { emoji: "💀", labelKey: "reactions.dead" },
  { emoji: "💩", labelKey: "reactions.poop" },
];

interface DraftRoom {
  id: string;
  draft_name: string;
  status: string;
  room_code: string;
  completed_at: string | null;
  captain1_player_id: string | null;
  captain2_player_id: string | null;
  captain3_player_id: string | null;
  num_teams: number | null;
  captains: unknown[] | null;
  location: string | null;
  notes: string | null;
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

export default function Results() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOwner, isMember } = useClubContext();
  const { t } = useTranslation("results");

  const [room, setRoom] = useState<DraftRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>("");
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [recentReaction, setRecentReaction] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  // Club member = owner or linked member — can start game nights & remake drafts
  const canManageDraft = isCreator || isOwner || isMember;
  const [showClaimSheet, setShowClaimSheet] = useState(false);
  const [claimSent, setClaimSent] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [gameNight, setGameNight] = useState<{ id: string; status: string } | null>(null);
  const [startingNight, setStartingNight] = useState(false);

  useEffect(() => {
    getSecureSessionId().then(setSessionId);
  }, []);

  useEffect(() => {
    fetchData();
  }, [roomCode]);

  // Fetch reactions when room is loaded
  const fetchReactions = useCallback(async () => {
    if (!room?.id || !sessionId) return;

    try {
      // Get counts
      const { data: counts } = await supabase.rpc("get_reaction_counts", {
        p_room_id: room.id,
      });
      if (counts) {
        setReactionCounts(counts as Record<string, number>);
      }

      // Get my reactions
      const { data: myReacts } = await supabase.rpc("get_my_reactions", {
        p_room_id: room.id,
        p_session_id: sessionId,
      });
      if (myReacts) {
        setMyReactions(new Set(myReacts as string[]));
      }
    } catch (err) {
      console.error("Error fetching reactions:", err);
    }
  }, [room?.id, sessionId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const fetchData = async () => {
    if (!roomCode) return;

    try {
      // Use public view that doesn't expose creator_user_id
      const { data: roomData, error: roomError } = await supabase
        .from("draft_rooms_public")
        .select("*")
        .eq("room_code", roomCode.toUpperCase())
        .single();

      if (roomError || !roomData) {
        navigate("/");
        return;
      }

      setRoom(roomData);

      // Redirect if not completed
      if (roomData.status !== "completed") {
        if (roomData.status === "drafting") {
          navigate(`/draft/${roomCode}`);
        } else {
          navigate(`/room/${roomCode}`);
        }
        return;
      }

      // Use public RPC to fetch players with names/photos
      const { data: playersData } = await supabase
        .rpc("get_room_players_public", { p_room_code: roomCode.toUpperCase() });

      setPlayers(playersData || []);

      // Check if current user is the creator (for remake button)
      if (user) {
        const { data: privateData } = await supabase
          .from("draft_rooms")
          .select("creator_user_id")
          .eq("id", roomData.id)
          .single();
        setIsCreator(privateData?.creator_user_id === user.id);

        // Check for existing game night
        try {
          const { data: nightData } = await supabase.rpc("find_game_night_by_draft", {
            p_draft_room_id: roomData.id,
          });
          if (nightData) {
            setGameNight(nightData as { id: string; status: string });
          }
        } catch {
          // Migration may not be applied yet — silently ignore
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const text = generateShareText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("share.title", { name: room?.draft_name }),
          text,
        });
      } catch (err) {
        // User cancelled or error
        copyToClipboard(text);
      }
    } else {
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("share.copied") });
  };

  const generateShareText = () => {
    if (!room) return "";

    let text = `🏆 ${t("share.title", { name: room.draft_name })}\n\n`;

    teams.forEach((team) => {
      text += `⚽ ${team.name}:\n`;
      team.players.forEach((player, idx) => {
        text += `  ${idx + 1}. ${player.display_name}\n`;
      });
      text += "\n";
    });

    if (room.location) {
      text += `📍 ${room.location}\n`;
    }
    if (room.notes) {
      text += `📝 ${room.notes}\n`;
    }

    return text;
  };

  const shareViaWhatsApp = () => {
    if (!room) return;

    const baseUrl = window.location.origin;
    const resultsUrl = `${baseUrl}/#/results/${room.room_code}`;

    let message = `🏆 *${t("share.title", { name: room.draft_name })}*\n\n`;

    teams.forEach((team) => {
      message += `⚽ *${team.name}:*\n`;
      team.players.forEach((player, idx) => {
        message += `${idx + 1}. ${player.display_name}\n`;
      });
      message += "\n";
    });

    if (room.location) {
      message += `📍 ${room.location}\n`;
    }
    if (room.notes) {
      message += `📝 ${room.notes}\n`;
    }
    if (room.location || room.notes) {
      message += "\n";
    }

    message += `📋 ${t("share.viewResults")}:\n${resultsUrl}\n\n`;
    message += `⚡ ${t("share.fairTeams")}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleReaction = async (emoji: string) => {
    if (!room?.id || !sessionId) return;

    // Optimistic update
    const wasReacted = myReactions.has(emoji);
    const newMyReactions = new Set(myReactions);
    if (wasReacted) {
      newMyReactions.delete(emoji);
    } else {
      newMyReactions.add(emoji);
    }
    setMyReactions(newMyReactions);

    // Show animation
    if (!wasReacted) {
      setRecentReaction(emoji);
      setTimeout(() => setRecentReaction(null), 600);
    }

    // Update counts optimistically
    setReactionCounts((prev) => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] || 0) + (wasReacted ? -1 : 1)),
    }));

    try {
      const { data, error } = await supabase.rpc("toggle_reaction", {
        p_room_id: room.id,
        p_emoji: emoji,
        p_session_id: sessionId,
      });

      if (error) throw error;

      // Update with actual count from server
      if (data) {
        setReactionCounts((prev) => ({
          ...prev,
          [emoji]: (data as { count: number }).count,
        }));
      }
    } catch (err) {
      console.error("Error toggling reaction:", err);
      // Revert on error
      setMyReactions(myReactions);
      fetchReactions();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) return null;

  const numTeams = getNumTeams(room);
  const teams = getAllCaptains(room).map((c) => {
    const captainPlayer = players.find((p) => p.player_id === c.playerId);
    const teamPlayers = players.filter(
      (p) => p.picked_by_captain_number === c.captainNumber
    );
    return {
      number: c.captainNumber,
      playerId: c.playerId,
      name: captainPlayer?.display_name || getCaptainLabel(c.captainNumber),
      photoUrl: captainPlayer?.photo_url,
      players: teamPlayers.sort(
        (a, b) => (a.pick_number || 0) - (b.pick_number || 0)
      ),
    };
  });

  // Truncate name for compact display
  const truncateName = (name: string, maxLen: number = 8) => {
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen) + "…";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900 relative overflow-hidden">
      {/* Pitch lines decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Center circle */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/10 rounded-full" />
        {/* Center line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/10" />
        {/* Horizontal lines */}
        <div className="absolute top-1/4 left-0 right-0 h-px bg-white/5" />
        <div className="absolute top-3/4 left-0 right-0 h-px bg-white/5" />
      </div>

      <div className="relative z-10">
        {/* Compact Header */}
        <header className="px-4 py-3 flex items-center justify-center gap-2 bg-black/20 backdrop-blur-sm">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h1 className="text-lg font-bold text-white truncate">
            {room.draft_name}
          </h1>
        </header>

        {/* Location & Notes */}
        {(room.location || room.notes) && (
          <div className="px-4 py-2 space-y-1">
            {room.location && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{room.location}</span>
              </div>
            )}
            {room.notes && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span>{room.notes}</span>
              </div>
            )}
          </div>
        )}

        {/* Teams Grid */}
        <div className="px-2 py-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`grid ${getTeamGridClass(numTeams)} gap-2`}
          >
          {teams.map((team, teamIdx) => (
            <motion.div
              key={team.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: teamIdx * 0.1 }}
              className="bg-black/30 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10"
            >
              {/* Captain Header */}
              <div
                className={`${getCaptainColor(team.number)} p-2 flex flex-col items-center gap-1`}
              >
                <div className="relative">
                  <PlayerAvatar
                    name={team.name}
                    photoUrl={team.photoUrl}
                    size="md"
                    className="border-2 border-white/40"
                  />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <Crown className="h-3 w-3 text-yellow-900" />
                  </div>
                </div>
                <span className="text-white font-bold text-sm truncate max-w-full px-1">
                  {truncateName(team.name, 10)}
                </span>
              </div>

              {/* Team Players */}
              <div className="p-1.5 space-y-1">
                {team.players.map((player, idx) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + idx * 0.03 }}
                    className="flex items-center gap-1.5 bg-white/10 rounded-lg p-1.5"
                  >
                    <PlayerAvatar
                      name={player.display_name}
                      photoUrl={player.photo_url}
                      size="xs"
                      className="flex-shrink-0"
                    />
                    <span className="text-white text-xs font-medium truncate">
                      {truncateName(player.display_name, 9)}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Team count - includes captain */}
              <div className="px-2 py-1.5 text-center border-t border-white/10">
                <span className="text-white/60 text-xs">
                  {t("players", { count: team.players.length + 1 })}
                </span>
              </div>
            </motion.div>
          ))}
          </motion.div>
        </div>
      </div>

      {/* Emoji Reactions */}
      <div className="relative z-10 px-4 pt-4">
        {/* Floating reaction animation */}
        <AnimatePresence>
          {recentReaction && (
            <motion.div
              key={recentReaction}
              initial={{ scale: 0, y: 0, opacity: 1 }}
              animate={{ scale: 2, y: -60, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute left-1/2 -translate-x-1/2 top-0 text-4xl pointer-events-none z-20"
            >
              {recentReaction}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-2">
          {REACTION_EMOJIS.map(({ emoji, labelKey }) => {
            const count = reactionCounts[emoji] || 0;
            const isActive = myReactions.has(emoji);

            return (
              <motion.button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.1 }}
                animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5
                  w-14 h-16 rounded-xl transition-all duration-200
                  ${isActive
                    ? "bg-white/30 ring-2 ring-white/50"
                    : "bg-white/10 hover:bg-white/20"
                  }
                `}
                title={t(labelKey)}
              >
                <span className="text-2xl">{emoji}</span>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    className="text-xs text-white/80 font-medium"
                  >
                    {count}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 px-4 py-4 flex flex-col gap-2">
        {/* Primary: Share to WhatsApp with text */}
        <Button
          onClick={shareViaWhatsApp}
          className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white h-12 text-base"
        >
          <MessageCircle className="h-5 w-5" />
          {t("share.button")}
        </Button>

        {/* Remake Draft - club members */}
        {canManageDraft && (
          <Button
            onClick={() => {
              // Navigate to create-draft with remake state
              navigate("/create-draft", {
                state: {
                  remake: true,
                  draftName: room?.draft_name,
                  location: room?.location,
                  notes: room?.notes,
                  playerIds: players.filter(p => p.player_id).map(p => p.player_id),
                  captainIds: getAllCaptains(room).map(c => c.playerId).filter(Boolean),
                },
              });
            }}
            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white h-11"
          >
            <RefreshCw className="h-5 w-5" />
            {t("remakeDraft")}
          </Button>
        )}

        {/* Game Night button — club members */}
        {canManageDraft && (
          <Button
            onClick={async () => {
              if (gameNight) {
                navigate(`/night/${gameNight.id}`);
              } else if (room) {
                setStartingNight(true);
                try {
                  const { data, error } = await supabase.rpc("start_game_night", {
                    p_draft_room_id: room.id,
                  });
                  if (error) throw error;
                  const result = data as { id: string; already_existed: boolean };
                  navigate(`/night/${result.id}`);
                } catch {
                  toast({ title: t("gameNight.errorTitle"), description: t("gameNight.errorDescription"), variant: "destructive" });
                } finally {
                  setStartingNight(false);
                }
              }
            }}
            disabled={startingNight}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11"
          >
            {startingNight ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Timer className="h-5 w-5" />
            )}
            {gameNight?.status === "ended"
              ? t("gameNight.viewSummary")
              : gameNight
                ? t("gameNight.continue")
                : t("gameNight.start")}
          </Button>
        )}

        {/* Secondary actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 h-10"
          >
            <Share2 className="h-4 w-4" />
            {t("share.copy")}
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 h-10"
          >
            <Link to="/">
              <Home className="h-4 w-4" />
              {t("home")}
            </Link>
          </Button>
        </div>
      </div>

      {/* PWA Install Prompt */}
      <div className="relative z-10 px-4 pt-2">
        <InstallPromptBanner variant="results" />
      </div>

      {/* Smart CTA - non-club visitors */}
      {!canManageDraft && (
        <div className="relative z-10 px-4 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 backdrop-blur-sm rounded-xl p-4 border border-emerald-400/30"
          >
            {/* Already linked member */}
            {isMember ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-400 font-bold text-sm">
                    {t("member.title")}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">
                    {t("member.subtitle")}
                  </p>
                </div>
              </div>
            ) : claimSent ? (
              /* Claim already sent */
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-400 font-bold text-sm">
                    {t("requestSent.title")}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">
                    {t("requestSent.subtitle")}
                  </p>
                </div>
              </div>
            ) : (
              /* Not a member — show claim button */
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">
                    {t("visitor.title")}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">
                    {t("visitor.subtitle")}
                  </p>
                  <button
                    onClick={() => setShowClaimSheet(true)}
                    className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {t("visitor.claimButton")}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Claim Bottom Sheet */}
      <AnimatePresence>
        {showClaimSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => setShowClaimSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-emerald-900 border-t border-white/10 rounded-t-2xl max-h-[70vh] flex flex-col"
            >
              {/* Sheet header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">{t("claim.sheetTitle")}</h3>
                <button
                  onClick={() => setShowClaimSheet(false)}
                  className="p-2 text-white/60 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Player list — grouped by team */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {teams.map((team) => {
                  // All claimable players on this team (captain + picked players)
                  const captainPlayer = players.find(
                    (p) => p.player_id === team.playerId && p.player_id
                  );
                  const teamClaimable = team.players.filter((p) => p.player_id);

                  if (!captainPlayer && teamClaimable.length === 0) return null;

                  return (
                    <div key={team.number}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getCaptainColor(team.number)}`} />
                        <p className="text-white/50 text-xs">{t("claim.teamLabel", { name: team.name })}</p>
                      </div>
                      <div className="space-y-2">
                        {/* Captain */}
                        {captainPlayer && captainPlayer.player_id && (
                          <button
                            key={captainPlayer.id}
                            disabled={claimingId !== null}
                            onClick={async () => {
                              if (!captainPlayer.player_id) return;
                              setClaimingId(captainPlayer.player_id);
                              try {
                                const { data, error } = await supabase.rpc("request_player_invite", {
                                  p_player_id: captainPlayer.player_id,
                                });
                                if (error) throw error;
                                const result = data as { success?: boolean; already_linked?: boolean };
                                if (result.already_linked) {
                                  toast({ title: t("claim.alreadyLinked") });
                                } else {
                                  setClaimSent(true);
                                }
                                setShowClaimSheet(false);
                              } catch (err) {
                                console.error("Error requesting invite:", err);
                                toast({ title: t("claim.errorTitle"), description: t("claim.errorDescription"), variant: "destructive" });
                              } finally {
                                setClaimingId(null);
                              }
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-xl hover:bg-black/40 transition-colors text-left"
                          >
                            <PlayerAvatar
                              name={captainPlayer.display_name}
                              photoUrl={captainPlayer.photo_url}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <span className="text-white font-medium text-sm flex-1 truncate">
                              {captainPlayer.display_name}
                            </span>
                            <Crown className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            {claimingId === captainPlayer.player_id && (
                              <Loader2 className="h-4 w-4 animate-spin text-white/60 flex-shrink-0" />
                            )}
                          </button>
                        )}
                        {/* Team players */}
                        {teamClaimable.map((player) => (
                          <button
                            key={player.id}
                            disabled={claimingId !== null}
                            onClick={async () => {
                              if (!player.player_id) return;
                              setClaimingId(player.player_id);
                              try {
                                const { data, error } = await supabase.rpc("request_player_invite", {
                                  p_player_id: player.player_id,
                                });
                                if (error) throw error;
                                const result = data as { success?: boolean; already_linked?: boolean };
                                if (result.already_linked) {
                                  toast({ title: t("claim.alreadyLinked") });
                                } else {
                                  setClaimSent(true);
                                }
                                setShowClaimSheet(false);
                              } catch (err) {
                                console.error("Error requesting invite:", err);
                                toast({ title: t("claim.errorTitle"), description: t("claim.errorDescription"), variant: "destructive" });
                              } finally {
                                setClaimingId(null);
                              }
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-xl hover:bg-black/40 transition-colors text-left"
                          >
                            <PlayerAvatar
                              name={player.display_name}
                              photoUrl={player.photo_url}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <span className="text-white font-medium text-sm flex-1 truncate">
                              {player.display_name}
                            </span>
                            {claimingId === player.player_id && (
                              <Loader2 className="h-4 w-4 animate-spin text-white/60 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {players.filter(p => p.player_id).length === 0 && (
                  <p className="text-center text-white/50 text-sm py-4">
                    {t("claim.noPlayers")}
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Growth CTA */}
      {!canManageDraft && (
        <div className="relative z-10 px-4 pt-2">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center max-w-md mx-auto">
            <p className="text-white font-bold text-sm mb-1">
              {t("growth.title")}
            </p>
            <p className="text-white/60 text-xs mb-3">
              {t("growth.subtitle")}
            </p>
            <Link
              to="/auth"
              className="inline-block px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm rounded-lg transition-colors"
            >
              {t("growth.cta")}
            </Link>
          </div>
        </div>
      )}

      {/* Powered by footer */}
      <div className="relative z-10 px-4 pb-6 pt-4 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/50 transition-colors text-xs"
        >
          <img src="/favicon.ico" alt="" className="w-3.5 h-3.5 opacity-40" />
          {t("footer.brand")}
        </Link>
      </div>
    </div>
  );
}
