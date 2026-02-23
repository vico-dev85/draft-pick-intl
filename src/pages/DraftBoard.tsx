import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWakeLock } from "@/hooks/useWakeLock";
import { getSecureSessionId, getTeamGridClass } from "@/lib/draftUtils";
import { getCaptainPlayerId, resolveCaptainNumber, getNumTeams } from "@/lib/captainHelpers";
import { ArrowLeft, Loader2, Volume2, VolumeX } from "lucide-react";
import {
  playSound,
  playRandomCrowd,
  playSoundThenSpeak,
  preloadSounds,
  isMuted,
  toggleMute,
} from "@/lib/sounds";
import {
  PlayerChip,
  TurnBanner,
  TeamColumn,
  PickAnnouncement,
  ConfirmPickModal,
} from "@/components/draft";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/ui/logo";

interface DraftRoom {
  id: string;
  draft_name: string;
  status: string;
  room_code: string;
  draft_order: number[] | null;
  current_turn_captain_number: number | null;
  current_pick_number: number | null;
  captain1_player_id: string | null;
  captain2_player_id: string | null;
  captain3_player_id: string | null;
  num_teams: number | null;
  captains: unknown[] | null;
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

interface PickResult {
  success: boolean;
  error?: string;
  picked_player_id?: string;
  pick_number?: number;
  current_turn?: number;
  current_pick?: number;
  draft_complete?: boolean;
}

interface Announcement {
  id: string;
  pickerName: string;
  playerName: string;
  isMe: boolean;
}

function truncateName(name: string, maxLength = 9): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "...";
}

function generateAnnouncementId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function vibrateIfSupported(pattern: number | number[] = 200): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported or blocked
    }
  }
}

export default function DraftBoard() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("draft");
  useWakeLock(true);

  const [room, setRoom] = useState<DraftRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  // New state for selection and announcements
  const [selectedPlayer, setSelectedPlayer] = useState<RoomPlayer | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const [soundMuted, setSoundMuted] = useState(isMuted);
  const [draftComplete, setDraftComplete] = useState(false);

  // Lock to prevent double-picks
  const pickLockRef = useRef(false);
  // Track if component is mounted for cleanup
  const isMountedRef = useRef(true);
  // Track realtime connection status
  const [realtimeStatus, setRealtimeStatus] = useState<string>("connecting");

  // Track own picks to avoid duplicate announcements
  const lastPickedByMeRef = useRef<string | null>(null);
  // Track previous players state for detecting new picks
  const previousPlayersRef = useRef<RoomPlayer[]>([]);
  // Track previous turn state for vibration
  const wasMyTurnRef = useRef(false);
  // Prevent duplicate draft-complete sound/navigation
  const draftCompleteHandledRef = useRef(false);

  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  // Handle draft completion — whistle + TTS + celebration overlay + delayed navigation
  const handleDraftComplete = useCallback(() => {
    if (draftCompleteHandledRef.current) return;
    draftCompleteHandledRef.current = true;
    setDraftComplete(true);
    playSound("whistle.mp3");
    setTimeout(() => navigate(`/results/${roomCode}`), 5000);
  }, [navigate, roomCode, t]);

  // Load sessionId and preload sounds on mount
  useEffect(() => {
    getSecureSessionId().then((id) => {
      setSessionId(id);
      if (isDebugMode) console.log("[DraftBoard] Session ID:", id);
    });
    preloadSounds();

    return () => {
      isMountedRef.current = false;
    };
  }, [isDebugMode]);

  // Determine if current session is a captain and which one
  const myCaptainPlayer = players.find(
    (p) => p.is_captain && p.claimed_by_session_id === sessionId
  );
  const myCaptainNumber = myCaptainPlayer
    ? resolveCaptainNumber(room, myCaptainPlayer.player_id)
    : null;

  const isMyTurn = myCaptainNumber === room?.current_turn_captain_number;

  // Vibrate and play sound when it becomes your turn
  useEffect(() => {
    if (isMyTurn && !wasMyTurnRef.current) {
      vibrateIfSupported([150, 100, 150]);
      playSoundThenSpeak("ding.mp3", t("board.tts.yourTurn"), 500);
    }
    wasMyTurnRef.current = isMyTurn;
  }, [isMyTurn, t]);

  // One follow-up vibration nudge at 15 seconds if still your turn
  useEffect(() => {
    if (!isMyTurn) return;
    const timeout = setTimeout(() => {
      vibrateIfSupported([100, 50, 100]);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [isMyTurn]);

  // Browser tab title when it's your turn
  useEffect(() => {
    if (isMyTurn) {
      document.title = `${t("board.tabTitleYourTurn")} | PickNKick`;
    } else {
      document.title = `${t("board.tabTitleDraft")} | PickNKick`;
    }
    return () => { document.title = "PickNKick"; };
  }, [isMyTurn, t]);

  // Get captain name by number
  const getCaptainNameByNumber = useCallback((captainNum: number): string => {
    const captainPlayerId = getCaptainPlayerId(room, captainNum);
    const captain = players.find(p => p.player_id === captainPlayerId);
    return captain?.display_name || `Captain ${captainNum}`;
  }, [room, players]);

  // Fetch players from database
  const fetchPlayers = useCallback(async (roomCodeParam: string) => {
    const { data: playersData } = await supabase
      .rpc("get_room_players_public", { p_room_code: roomCodeParam.toUpperCase() });

    if (isMountedRef.current && playersData) {
      setPlayers(playersData);
    }
  }, []);

  // Detect picks from other captains via Realtime and show announcements
  useEffect(() => {
    const prevPlayers = previousPlayersRef.current;

    for (const player of players) {
      const prevPlayer = prevPlayers.find(p => p.id === player.id);

      // Detect new pick (wasn't picked before, is picked now)
      if (
        player.picked_by_captain_number !== null &&
        prevPlayer?.picked_by_captain_number === null &&
        player.id !== lastPickedByMeRef.current // Not my own pick
      ) {
        const captainName = getCaptainNameByNumber(player.picked_by_captain_number);
        setAnnouncement({
          id: generateAnnouncementId(),
          pickerName: captainName,
          playerName: truncateName(player.display_name),
          isMe: false,
        });
        // Sound: crowd reaction
        playRandomCrowd();
        break; // Only one announcement at a time
      }
    }

    // Update previous state
    previousPlayersRef.current = [...players];
  }, [players, getCaptainNameByNumber, t]);

  // Initial data fetch
  useEffect(() => {
    if (!roomCode) return;

    const fetchInitialData = async () => {
      try {
        // Fetch room data
        const { data: roomData, error: roomError } = await supabase
          .from("draft_rooms_public")
          .select("*")
          .eq("room_code", roomCode.toUpperCase())
          .single();

        if (!isMountedRef.current) return;

        if (roomError || !roomData) {
          navigate("/");
          return;
        }

        // Redirect based on status
        if (roomData.status === "completed") {
          navigate(`/results/${roomCode}`);
          return;
        }

        if (roomData.status === "waiting") {
          navigate(`/room/${roomCode}`);
          return;
        }

        const parsedRoom: DraftRoom = {
          ...roomData,
          draft_order: roomData.draft_order ? (roomData.draft_order as number[]) : null,
        };

        setRoom(parsedRoom);
        await fetchPlayers(roomCode);
        setLoading(false);

      } catch (err) {
        console.error("[DraftBoard] Fetch error:", err);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [roomCode, navigate, fetchPlayers]);

  // REALTIME: Subscribe to room changes (turn updates)
  useEffect(() => {
    if (!room?.id) return;

    console.log("[DraftBoard] Setting up Realtime subscription for room:", room.id);

    const channel = supabase
      .channel(`draft-room-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draft_rooms_public',
          filter: `id=eq.${room.id}`
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const newData = payload.new as {
            current_turn_captain_number: number;
            current_pick_number: number;
            status: string;
          };

          console.log("[Realtime] Room update received:", newData);

          setRoom(prev => prev ? {
            ...prev,
            current_turn_captain_number: newData.current_turn_captain_number,
            current_pick_number: newData.current_pick_number,
            status: newData.status,
          } : null);

          if (newData.status === 'completed') {
            handleDraftComplete();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draft_room_players',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const updatedPlayer = payload.new as {
            id: string;
            picked_by_captain_number: number | null;
            pick_number: number | null;
          };

          console.log("[Realtime] Player update received:", updatedPlayer);

          setPlayers(prev => prev.map(p =>
            p.id === updatedPlayer.id
              ? { ...p, picked_by_captain_number: updatedPlayer.picked_by_captain_number, pick_number: updatedPlayer.pick_number }
              : p
          ));
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
        setRealtimeStatus(status);
      });

    return () => {
      console.log("[DraftBoard] Removing Realtime channel");
      supabase.removeChannel(channel);
    };
  }, [room?.id, navigate, roomCode]);

  // Fallback polling
  useEffect(() => {
    if (!room?.id || room.status === "completed" || !roomCode) return;

    const fetchFreshState = async () => {
      const { data: freshState } = await supabase
        .rpc("get_draft_state", { p_room_id: room.id });

      const state = freshState?.[0];
      if (state && isMountedRef.current) {
        setRoom(prev => prev ? {
          ...prev,
          current_turn_captain_number: state.current_turn_captain_number,
          current_pick_number: state.current_pick_number,
          status: state.status,
        } : null);

        if (state.status === 'completed') {
          handleDraftComplete();
        }
      }

      fetchPlayers(roomCode);
    };

    const pollInterval = setInterval(fetchFreshState, 2000);
    return () => clearInterval(pollInterval);
  }, [room?.id, room?.status, roomCode, fetchPlayers, navigate]);

  // Handle player selection (first tap)
  const handleSelectPlayer = (player: RoomPlayer) => {
    if (!isMyTurn || picking) return;
    setSelectedPlayer(player);
  };

  // Handle confirm pick (second tap on confirm button)
  const handleConfirmPick = async () => {
    if (!selectedPlayer || !room || !myCaptainNumber || !sessionId) return;

    const playerId = selectedPlayer.id;
    const playerName = selectedPlayer.display_name;

    // Prevent double-picks
    if (pickLockRef.current || picking) {
      console.log("[DraftBoard] Pick blocked: already picking");
      return;
    }

    pickLockRef.current = true;
    setPicking(playerId);
    setSelectedPlayer(null);
    lastPickedByMeRef.current = playerId;

    if (isDebugMode) {
      console.log(`[DraftBoard] Picking player ${playerId} as captain ${myCaptainNumber}`);
    }

    try {
      const { data, error } = await supabase.rpc("pick_player_atomic", {
        p_room_id: room.id,
        p_captain_number: myCaptainNumber,
        p_player_id: playerId,
        p_session_id: sessionId,
      });

      const result = data as PickResult;

      if (error) {
        console.error("[DraftBoard] RPC error:", error);
        toast({
          title: t("board.errors.error"),
          description: t("board.errors.pickFailed"),
          variant: "destructive",
        });
        lastPickedByMeRef.current = null;
        return;
      }

      if (!result.success) {
        console.log("[DraftBoard] Pick failed:", result.error);
        lastPickedByMeRef.current = null;

        if (result.error === 'not_your_turn') {
          toast({
            title: t("board.errors.notYourTurn"),
            description: t("board.errors.captainTurn", { captain: result.current_turn }),
            variant: "destructive",
          });
          setRoom(prev => prev ? {
            ...prev,
            current_turn_captain_number: result.current_turn || prev.current_turn_captain_number,
            current_pick_number: result.current_pick || prev.current_pick_number,
          } : null);
        } else if (result.error === 'player_unavailable') {
          toast({
            title: t("board.errors.playerUnavailable"),
            description: t("board.errors.alreadyPicked"),
            variant: "destructive",
          });
          if (roomCode) fetchPlayers(roomCode);
        } else if (result.error === 'pick_already_made') {
          toast({
            title: t("board.errors.pickAlreadyMade"),
            description: t("board.errors.refreshing"),
          });
          if (roomCode) fetchPlayers(roomCode);
        } else if (result.error === 'unauthorized') {
          toast({
            title: t("board.errors.unauthorized"),
            description: t("board.errors.notCaptain"),
            variant: "destructive",
          });
        } else {
          toast({
            title: t("board.errors.error"),
            description: result.error || t("board.errors.pickFailed"),
            variant: "destructive",
          });
        }
        return;
      }

      // Success! Show announcement + sound
      console.log(`[DraftBoard] Pick SUCCESS: ${playerName} (pick #${result.pick_number})`);

      playRandomCrowd();

      setAnnouncement({
        id: generateAnnouncementId(),
        pickerName: t("board.you"),
        playerName: truncateName(playerName),
        isMe: true,
      });

      // Optimistically update local state
      setPlayers(prev => prev.map(p =>
        p.id === playerId
          ? { ...p, picked_by_captain_number: myCaptainNumber, pick_number: result.pick_number || null }
          : p
      ));

      // Update room state
      if (result.draft_complete) {
        handleDraftComplete();
      } else if (result.current_turn && result.current_pick) {
        setRoom(prev => prev ? {
          ...prev,
          current_turn_captain_number: result.current_turn!,
          current_pick_number: result.current_pick!,
        } : null);
      }

    } catch (err) {
      console.error("[DraftBoard] Error:", err);
      lastPickedByMeRef.current = null;
      toast({
        title: t("board.errors.error"),
        description: t("board.errors.pickFailed"),
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        pickLockRef.current = false;
        setPicking(null);
      }, 200);
    }
  };

  // Cancel selection
  const handleCancelSelection = () => {
    setSelectedPlayer(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!room) return null;

  const availablePlayers = players.filter(
    (p) => !p.is_captain && !p.picked_by_captain_number
  );

  const totalNonCaptainPlayers = players.filter(p => !p.is_captain).length;

  const numTeams = getNumTeams(room);

  // Order columns by raffle result (first picker on the left in LTR)
  const raffleOrder = room.draft_order
    ? (room.draft_order as number[]).slice(0, numTeams)
    : Array.from({ length: numTeams }, (_, i) => i + 1);

  const teams = raffleOrder.map((num) => {
    const captainPlayerId = getCaptainPlayerId(room, num);
    const captainPlayer = players.find(p => p.player_id === captainPlayerId);
    const pickedPlayers = players
      .filter(p => p.picked_by_captain_number === num)
      .sort((a, b) => (a.pick_number || 0) - (b.pick_number || 0));

    return {
      number: num,
      captainName: captainPlayer?.display_name || `Captain ${num}`,
      captainPhotoUrl: captainPlayer?.photo_url,
      players: pickedPlayers.map(p => ({
        id: p.id,
        name: p.display_name,
        photoUrl: p.photo_url,
      })),
    };
  });

  const currentCaptainName = getCaptainNameByNumber(room.current_turn_captain_number || 1);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Compact Header - purple branded */}
      <header className="px-3 py-2 flex items-center justify-between border-b border-purple-700 bg-purple-800">
        <Link
          to="/"
          className="flex items-center gap-1 text-white/70 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>{t("board.back")}</span>
        </Link>
        <Logo size="sm" variant="light" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundMuted(toggleMute())}
            className="text-white/60 hover:text-white transition-colors"
            title={soundMuted ? t("board.enableSounds") : t("board.muteSounds")}
          >
            {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="text-xs text-white/60">{room.room_code}</span>
        </div>
      </header>

      <main className="flex-1 px-3 py-2 flex flex-col lg:px-6 lg:py-3">
        {/* Debug Panel */}
        {isDebugMode && (
          <div className="mb-2 p-2 bg-black/90 text-green-400 text-[10px] font-mono rounded border border-green-500">
            <div className="grid grid-cols-4 gap-x-2">
              <div>Cap: {myCaptainNumber || 'viewer'}</div>
              <div>Turn: {room.current_turn_captain_number}</div>
              <div>Pick: {room.current_pick_number}</div>
              <div className={realtimeStatus === 'SUBSCRIBED' ? 'text-green-400' : 'text-red-400'}>
                RT: {realtimeStatus.slice(0, 4)}
              </div>
            </div>
          </div>
        )}

        {/* Turn Banner */}
        <TurnBanner
          captainNumber={room.current_turn_captain_number || 1}
          captainName={currentCaptainName}
          isMyTurn={isMyTurn}
        />

        {/* Draft Progress */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalNonCaptainPlayers > 0 ? ((totalNonCaptainPlayers - availablePlayers.length) / totalNonCaptainPlayers) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
            {totalNonCaptainPlayers - availablePlayers.length}/{totalNonCaptainPlayers}
          </span>
        </div>

        {/* Desktop: two-panel layout / Mobile: stacked */}
        <div className="mt-3 flex-1 lg:grid lg:grid-cols-[1fr,320px] lg:gap-4 xl:grid-cols-[1fr,380px]">

          {/* Available Players Pool — main area on desktop, below teams on mobile */}
          <div className="order-2 lg:order-1 mt-4 lg:mt-0 pb-6">
            <div className="text-base font-semibold mb-3 text-gray-800">
              {t("board.availablePlayers", { count: availablePlayers.length })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              <AnimatePresence mode="popLayout">
                {availablePlayers.map((player) => {
                  const isPicking = picking === player.id;

                  let state: "available" | "highlighted" | "selected" | "disabled" = "disabled";
                  if (isMyTurn && !picking) {
                    state = "highlighted";
                  }

                  return (
                    <motion.div
                      key={player.id}
                      layout="position"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ layout: { type: "spring", stiffness: 200, damping: 25 }, opacity: { duration: 0.2 } }}
                    >
                      {isPicking ? (
                        <div className="h-10 flex items-center justify-center bg-primary/20 rounded-xl">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : (
                        <PlayerChip
                          name={player.display_name}
                          photoUrl={player.photo_url}
                          size="md"
                          state={state}
                          onClick={() => handleSelectPlayer(player)}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Teams — sidebar on desktop, top on mobile */}
          <div className="order-1 lg:order-2">
            <div className={`grid ${getTeamGridClass(numTeams)} gap-2 lg:grid-cols-1 lg:gap-3`}>
              {teams.map((team) => (
                <TeamColumn
                  key={team.number}
                  captainNumber={team.number}
                  captainName={team.captainName}
                  captainPhotoUrl={team.captainPhotoUrl}
                  players={team.players}
                  isActive={room.current_turn_captain_number === team.number}
                  totalPlayersInDraft={totalNonCaptainPlayers}
                  numTeams={numTeams}
                />
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Centered Confirmation Modal */}
      <AnimatePresence>
        {selectedPlayer && myCaptainNumber && (
          <ConfirmPickModal
            playerName={selectedPlayer.display_name}
            playerPhotoUrl={selectedPlayer.photo_url}
            captainNumber={myCaptainNumber}
            onConfirm={handleConfirmPick}
            onCancel={handleCancelSelection}
          />
        )}
      </AnimatePresence>

      {/* Pick Announcement Overlay */}
      <AnimatePresence mode="wait">
        {announcement && (
          <PickAnnouncement
            key={announcement.id}
            id={announcement.id}
            pickerName={announcement.pickerName}
            playerName={announcement.playerName}
            isMe={announcement.isMe}
            onComplete={() => {
              setAnnouncement(null);
              if (announcement.isMe) {
                lastPickedByMeRef.current = null;
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Draft Complete Overlay */}
      <AnimatePresence>
        {draftComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
              className="text-center p-8"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-6xl mb-4"
              >
                🏆
              </motion.div>
              <h2 className="text-3xl font-heading font-bold text-white mb-2">
                {t("board.draftComplete")}
              </h2>
              <p className="text-white/60 text-sm">
                {t("board.viewResults")}...
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-white/40 mx-auto mt-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
