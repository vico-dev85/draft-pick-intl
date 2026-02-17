import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWakeLock } from "@/hooks/useWakeLock";
import { getSecureSessionId } from "@/lib/draftUtils";
import { ArrowRight, Loader2, Volume2, VolumeX } from "lucide-react";
import {
  playSound,
  playRandomCrowd,
  speak,
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

  // Handle draft completion — whistle + TTS + delayed navigation (deduplicated)
  const handleDraftComplete = useCallback(() => {
    if (draftCompleteHandledRef.current) return;
    draftCompleteHandledRef.current = true;
    playSound("whistle.mp3");
    setTimeout(() => speak("הקבוצות מוכנות. תודה שבחרת כוחות אונליין"), 2200);
    setTimeout(() => navigate(`/results/${roomCode}`), 5000);
  }, [navigate, roomCode]);

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
    ? room?.captain1_player_id === myCaptainPlayer.player_id
      ? 1
      : room?.captain2_player_id === myCaptainPlayer.player_id
      ? 2
      : 3
    : null;

  const isMyTurn = myCaptainNumber === room?.current_turn_captain_number;

  // Vibrate and play sound when it becomes your turn
  useEffect(() => {
    if (isMyTurn && !wasMyTurnRef.current) {
      vibrateIfSupported([150, 100, 150]);
      playSoundThenSpeak("ding.mp3", "תורך לבחור", 500);
    }
    wasMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

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
      document.title = "🟢 תורך לבחור! | Kohot";
    } else {
      document.title = "דראפט | Kohot";
    }
    return () => { document.title = "Kohot"; };
  }, [isMyTurn]);

  // Get captain name by number
  const getCaptainNameByNumber = useCallback((captainNum: number): string => {
    const captainPlayerId =
      captainNum === 1 ? room?.captain1_player_id :
      captainNum === 2 ? room?.captain2_player_id :
      room?.captain3_player_id;

    const captain = players.find(p => p.player_id === captainPlayerId);
    return captain?.display_name || `קפטן ${captainNum}`;
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
        // Sound: crowd reaction + TTS "[captain] בחר את [player]"
        playRandomCrowd();
        setTimeout(() => speak(`${captainName} בחר את ${player.display_name}`), 600);
        break; // Only one announcement at a time
      }
    }

    // Update previous state
    previousPlayersRef.current = [...players];
  }, [players, getCaptainNameByNumber]);

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
          title: "שגיאה",
          description: "לא הצלחנו לבחור את השחקן",
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
            title: "לא התור שלך",
            description: `עכשיו התור של קפטן ${result.current_turn}`,
            variant: "destructive",
          });
          setRoom(prev => prev ? {
            ...prev,
            current_turn_captain_number: result.current_turn || prev.current_turn_captain_number,
            current_pick_number: result.current_pick || prev.current_pick_number,
          } : null);
        } else if (result.error === 'player_unavailable') {
          toast({
            title: "השחקן לא זמין",
            description: "השחקן כבר נבחר",
            variant: "destructive",
          });
          if (roomCode) fetchPlayers(roomCode);
        } else if (result.error === 'pick_already_made') {
          toast({
            title: "הבחירה כבר בוצעה",
            description: "מרענן את המצב...",
          });
          if (roomCode) fetchPlayers(roomCode);
        } else if (result.error === 'unauthorized') {
          toast({
            title: "אין הרשאה",
            description: "אתה לא מחובר כקפטן",
            variant: "destructive",
          });
        } else {
          toast({
            title: "שגיאה",
            description: result.error || "לא הצלחנו לבחור",
            variant: "destructive",
          });
        }
        return;
      }

      // Success! Show announcement + sound
      console.log(`[DraftBoard] Pick SUCCESS: ${playerName} (pick #${result.pick_number})`);

      playRandomCrowd();
      setTimeout(() => speak(`בחרת את ${playerName}`), 600);

      setAnnouncement({
        id: generateAnnouncementId(),
        pickerName: "את/ה",
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
        title: "שגיאה",
        description: "לא הצלחנו לבחור את השחקן",
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!room) return null;

  const availablePlayers = players.filter(
    (p) => !p.is_captain && !p.picked_by_captain_number
  );

  const totalNonCaptainPlayers = players.filter(p => !p.is_captain).length;

  // Order columns by raffle result (first picker on the right in RTL)
  const raffleOrder = room.draft_order
    ? (room.draft_order as number[]).slice(0, 3)
    : [1, 2, 3];

  const teams = raffleOrder.map((num) => {
    const captainPlayerId =
      num === 1 ? room.captain1_player_id :
      num === 2 ? room.captain2_player_id :
      room.captain3_player_id;

    const captainPlayer = players.find(p => p.player_id === captainPlayerId);
    const pickedPlayers = players
      .filter(p => p.picked_by_captain_number === num)
      .sort((a, b) => (a.pick_number || 0) - (b.pick_number || 0));

    return {
      number: num as 1 | 2 | 3,
      captainName: captainPlayer?.display_name || `קפטן ${num}`,
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
      {/* Compact Header - emerald branded */}
      <header className="px-3 py-2 flex items-center justify-between border-b border-emerald-700 bg-emerald-800" dir="rtl">
        <Link
          to="/"
          className="flex items-center gap-1 text-white/70 hover:text-white transition-colors text-sm"
        >
          <ArrowRight className="h-3 w-3" />
          <span>חזרה</span>
        </Link>
        <img src="/logo.png" alt="kohot.online" className="h-6 w-auto" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundMuted(toggleMute())}
            className="text-white/60 hover:text-white transition-colors"
            title={soundMuted ? "הפעל צלילים" : "השתק צלילים"}
          >
            {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="text-xs text-white/60">{room.room_code}</span>
        </div>
      </header>

      <main className="flex-1 px-3 py-2 flex flex-col" dir="rtl">
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

        {/* Teams Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {teams.map((team) => (
            <TeamColumn
              key={team.number}
              captainNumber={team.number}
              captainName={team.captainName}
              captainPhotoUrl={team.captainPhotoUrl}
              players={team.players}
              isActive={room.current_turn_captain_number === team.number}
              totalPlayersInDraft={totalNonCaptainPlayers}
            />
          ))}
        </div>

        {/* Available Players Pool */}
        <div className="mt-4 flex-1">
          <div className="text-base font-semibold mb-3 text-gray-800">
            שחקנים זמינים ({availablePlayers.length})
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    layout
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
    </div>
  );
}
