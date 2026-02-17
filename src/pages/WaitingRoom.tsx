import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useWakeLock } from "@/hooks/useWakeLock";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getSecureSessionId, getCaptainColor, generateRaffleOrder } from "@/lib/draftUtils";
import {
  ArrowLeft,
  Loader2,
  Crown,
  Copy,
  Check,
  Users,
  Share2,
  Wifi,
  WifiOff,
  PartyPopper,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playSound, stopSound, preloadSounds, isMuted, toggleMute } from "@/lib/sounds";
import { useTranslation } from "react-i18next";

// Hand images for shuffle animation
const HAND_IMAGES = [
  '/assets/hands/hand_up_top.png',
  '/assets/hands/hand_down_top.png',
  '/assets/hands/hand_up_left.png',
  '/assets/hands/hand_down_left.png',
  '/assets/hands/hand_up_right.png',
  '/assets/hands/hand_down_right.png',
];
import type { RealtimeChannel } from "@supabase/supabase-js";

// Module-level tracking to prevent double animations across component remounts
// Only resets on full page refresh
const roomAnimationCompleted = new Map<string, boolean>();

interface DraftRoomPublic {
  id: string;
  draft_name: string;
  status: string;
  room_code: string;
  captain1_player_id: string | null;
  captain2_player_id: string | null;
  captain3_player_id: string | null;
}

interface DraftRoom extends DraftRoomPublic {
  creator_user_id?: string;
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

type RafflePhase = "waiting" | "countdown" | "shuffling" | "result" | "starting";

export default function WaitingRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("draft");
  useWakeLock(true);

  const [room, setRoom] = useState<DraftRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [sessionId, setSessionId] = useState<string>("");
  const [realtimeStatus, setRealtimeStatus] = useState<string>("disconnected");
  const [connectedCaptainNumbers, setConnectedCaptainNumbers] = useState<Set<number>>(new Set());

  // Raffle state
  const [rafflePhase, setRafflePhase] = useState<RafflePhase>("waiting");
  const [raffleOrder, setRaffleOrder] = useState<number[]>([1, 2, 3]);
  const [shuffleDisplay, setShuffleDisplay] = useState<number[]>([1, 2, 3]);
  const [countdown, setCountdown] = useState<number>(3);
  const [pendingRaffleOrder, setPendingRaffleOrder] = useState<number[] | null>(null);
  const [shuffleHands, setShuffleHands] = useState<string[]>([
    HAND_IMAGES[0],
    HAND_IMAGES[1],
    HAND_IMAGES[2],
  ]);

  const [soundMuted, setSoundMuted] = useState(isMuted);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const raffleStartedRef = useRef(false);
  const roomRef = useRef<DraftRoom | null>(null);
  const playersRef = useRef<RoomPlayer[]>([]);
  const isSubscribedRef = useRef(false);
  const prevConnectedCaptainsRef = useRef(0);

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { playersRef.current = players; }, [players]);

  // Preload sounds on mount
  useEffect(() => { preloadSounds(); }, []);

  // Only creator can update status - must have defined user AND matching creator_user_id
  const isCreator = !!user?.id && !!room?.creator_user_id && user.id === room.creator_user_id;
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Rapid hand shuffle effect during shuffling phase — accelerating speed
  useEffect(() => {
    if (rafflePhase !== "shuffling") return;
    let speed = 120; // Start at 120ms
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      setShuffleHands([
        HAND_IMAGES[Math.floor(Math.random() * HAND_IMAGES.length)],
        HAND_IMAGES[Math.floor(Math.random() * HAND_IMAGES.length)],
        HAND_IMAGES[Math.floor(Math.random() * HAND_IMAGES.length)],
      ]);
      // Accelerate down to 50ms minimum
      if (speed > 50) speed -= 3;
      timeoutId = setTimeout(tick, speed);
    };

    timeoutId = setTimeout(tick, speed);
    return () => clearTimeout(timeoutId);
  }, [rafflePhase]);

  useEffect(() => {
    getSecureSessionId().then(setSessionId);
  }, []);

  const fetchData = useCallback(async () => {
    if (!roomCode) return;

    try {
      const { data: roomData, error: roomError } = await supabase
        .from("draft_rooms_public")
        .select("*")
        .eq("room_code", roomCode.toUpperCase())
        .single();

      if (roomError || !roomData) {
        toast({ title: t("waiting.roomNotFound"), variant: "destructive" });
        navigate("/");
        return;
      }

      let creatorUserId: string | undefined;
      if (user) {
        const { data: privateData } = await supabase
          .from("draft_rooms")
          .select("creator_user_id")
          .eq("id", roomData.id)
          .single();
        creatorUserId = privateData?.creator_user_id;
      }

      setRoom({ ...roomData, creator_user_id: creatorUserId });

      if (roomData.status === "drafting" || roomData.status === "completed") {
        navigate(`/draft/${roomCode}`);
        return;
      }

      const { data: playersData } = await supabase
        .rpc("get_room_players_public", { p_room_code: roomCode.toUpperCase() });

      setPlayers(playersData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [roomCode, navigate, user, toast, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper function to track presence - called when subscribed and player data ready
  const trackPresence = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !isSubscribedRef.current || !sessionId) return;

    const currentPlayers = playersRef.current;
    const currentRoom = roomRef.current;
    if (!currentPlayers.length || !currentRoom) return;

    const myPlayer = currentPlayers.find((p) => p.claimed_by_session_id === sessionId);
    if (!myPlayer) return;

    const isCaptain = myPlayer.is_captain === true;
    let myCaptainNumber: number | null = null;

    if (isCaptain && myPlayer.player_id) {
      if (currentRoom.captain1_player_id === myPlayer.player_id) myCaptainNumber = 1;
      else if (currentRoom.captain2_player_id === myPlayer.player_id) myCaptainNumber = 2;
      else if (currentRoom.captain3_player_id === myPlayer.player_id) myCaptainNumber = 3;
    }

    console.log("[Presence] Tracking as:", isCaptain ? `Captain ${myCaptainNumber}` : "Viewer", "- channel subscribed:", isSubscribedRef.current);

    channel.track({
      role: isCaptain ? "captain" : "viewer",
      captain_number: myCaptainNumber,
      draft_room_player_id: myPlayer.id,
      display_name: myPlayer.display_name,
      online_at: new Date().toISOString(),
    });
  }, [sessionId]);

  // Setup Presence channel
  useEffect(() => {
    if (!room?.id || !sessionId) return;

    console.log("[Presence] Creating channel for room:", room.id);
    isSubscribedRef.current = false;

    const channel = supabase.channel(`presence-room-${room.id}`, {
      config: { presence: { key: sessionId } },
    });

    const updateConnectedCaptains = () => {
      const state = channel.presenceState();
      const captainNumbers = new Set<number>();
      Object.values(state).forEach((presences) => {
        (presences as Array<Record<string, unknown>>).forEach((p) => {
          if (p.role === "captain" && typeof p.captain_number === "number") {
            captainNumbers.add(p.captain_number);
          }
        });
      });
      console.log("[Presence] Connected captains:", Array.from(captainNumbers));
      setConnectedCaptainNumbers(captainNumbers);
    };

    channel
      .on("presence", { event: "sync" }, updateConnectedCaptains)
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("[Presence] Join:", newPresences);
        updateConnectedCaptains();
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("[Presence] Leave:", leftPresences);
        updateConnectedCaptains();
      })
      .subscribe((status) => {
        console.log("[Presence] Channel status:", status);
        setRealtimeStatus(status);

        if (status === "SUBSCRIBED") {
          isSubscribedRef.current = true;
          // Track presence immediately when subscribed
          trackPresence();
        } else {
          isSubscribedRef.current = false;
        }
      });

    channelRef.current = channel;

    return () => {
      console.log("[Presence] Removing channel");
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room?.id, sessionId, navigate, roomCode, trackPresence]);

  // Re-track when player data changes (only if already subscribed)
  useEffect(() => {
    if (players.length > 0 && isSubscribedRef.current) {
      trackPresence();
    }
  }, [players, trackPresence]);

  // DB subscription for status changes - navigates when drafting starts
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room-status-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "draft_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const newRoom = payload.new as { status: string };
          console.log("[DB] Room status updated:", newRoom.status);

          if (newRoom.status === "drafting") {
            console.log("[DB] Navigating to draft");
            navigate(`/draft/${roomCode}`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room?.id, navigate, roomCode]);

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(room?.room_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: t("waiting.codeCopied") });
  };

  const shareViaWhatsApp = () => {
    const baseUrl = window.location.origin;
    const joinUrl = `${baseUrl}/#/join/${room?.room_code}`;
    const message = t("waiting.shareMessage", { name: room?.draft_name, code: room?.room_code, url: joinUrl });
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const getCaptainInfo = (captainPlayerId: string | null, captainNumber: number) => {
    if (!captainPlayerId) return null;
    const player = players.find((p) => p.player_id === captainPlayerId);
    const isConnected = connectedCaptainNumbers.has(captainNumber);
    return {
      name: player?.display_name || t("waiting.waiting"),
      photoUrl: player?.photo_url,
      isConnected,
      captainNumber,
    };
  };

  const captain1 = getCaptainInfo(room?.captain1_player_id || null, 1);
  const captain2 = getCaptainInfo(room?.captain2_player_id || null, 2);
  const captain3 = getCaptainInfo(room?.captain3_player_id || null, 3);
  const captainsInfo = [captain1, captain2, captain3].filter(Boolean);

  const connectedCount = connectedCaptainNumbers.size;
  const allCaptainsConnected = connectedCount === 3;

  // Play captain-enter sound when a new captain connects
  useEffect(() => {
    if (connectedCount > prevConnectedCaptainsRef.current && prevConnectedCaptainsRef.current >= 0) {
      playSound("captain-enter.mp3");
    }
    prevConnectedCaptainsRef.current = connectedCount;
  }, [connectedCount]);

  const getCaptainName = (captainNumber: number) => {
    const captain = captainsInfo.find(c => c?.captainNumber === captainNumber);
    return captain?.name || `Captain ${captainNumber}`;
  };

  // Local animation - runs independently on each client with predetermined result
  const runLocalRaffleAnimation = useCallback(async (finalOrder: number[]) => {
    console.log("[Animation] Starting local animation with order:", finalOrder);

    // COUNTDOWN (3 seconds) — silent, numbers speak for themselves
    for (let i = 3; i >= 1; i--) {
      if (!isMountedRef.current) return;
      setRafflePhase("countdown");
      setCountdown(i);
      await sleep(1000);
    }

    if (!isMountedRef.current) return;

    // SHUFFLING (4 seconds) — drumroll plays during this phase
    playSound("drumroll.mp3");
    // Accelerating shuffle: starts at 250ms, ends at 100ms
    const totalIterations = 20;
    for (let i = 0; i < totalIterations; i++) {
      if (!isMountedRef.current) { stopSound("drumroll.mp3"); return; }
      const tempDisplay = generateRaffleOrder();
      setRafflePhase("shuffling");
      setShuffleDisplay(tempDisplay);
      // Accelerate: lerp from 250ms to 100ms
      const delay = 250 - Math.floor((i / totalIterations) * 150);
      await sleep(delay);
    }

    if (!isMountedRef.current) return;
    stopSound("drumroll.mp3");

    // RESULT (show for 2 seconds) — reveal sound
    playSound("reveal.mp3");
    setRafflePhase("result");
    setRaffleOrder(finalOrder);
    setShuffleDisplay(finalOrder);
    await sleep(2000);

    if (!isMountedRef.current) return;

    // Animation complete - show "starting" phase
    // Navigation happens via DB subscription when status changes to "drafting"
    setRafflePhase("starting");
    console.log("[Animation] Complete, waiting for DB status change to navigate");
  }, []);

  // Trigger animation when pendingRaffleOrder is set (from broadcast)
  useEffect(() => {
    if (pendingRaffleOrder && pendingRaffleOrder.length === 3) {
      console.log("[Effect] Pending order detected, starting animation");
      runLocalRaffleAnimation(pendingRaffleOrder);
      setPendingRaffleOrder(null); // Clear to prevent re-trigger
    }
  }, [pendingRaffleOrder, runLocalRaffleAnimation]);


  // When all captains connect, ALL clients read the pre-generated order and run animation
  // The order was already generated when the draft was created (in CreateDraft.tsx)
  useEffect(() => {
    if (!allCaptainsConnected) return;
    if (!room?.id) return;
    if (rafflePhase !== "waiting") return;
    if (raffleStartedRef.current) return;

    // Module-level check to prevent double animation across remounts
    if (roomAnimationCompleted.get(room.id)) {
      console.log("[Client] Animation already completed for this room, skipping...");
      return;
    }

    console.log("[Client] All captains connected, fetching pre-generated raffle order...");

    let cancelled = false;

    const fetchAndAnimate = async () => {
      // The order should already exist (pre-generated at draft creation)
      // Poll a few times just in case of timing issues
      for (let attempt = 0; attempt < 10; attempt++) {
        if (cancelled) return;

        const { data, error } = await supabase
          .from("draft_rooms_public")
          .select("draft_order")
          .eq("id", room.id)
          .single();

        if (error) {
          console.error("[Client] Error fetching draft_order:", error);
        }

        if (data?.draft_order && data.draft_order.length >= 3) {
          if (raffleStartedRef.current) return; // Another effect already started
          raffleStartedRef.current = true;

          // Extract raffle order (first 3 elements = first round picks)
          const raffleOrder = data.draft_order.slice(0, 3) as number[];
          console.log("[Client] Got pre-generated order:", JSON.stringify(raffleOrder), "Full draft_order:", JSON.stringify(data.draft_order));

          // Run animation (same on all clients with same predetermined result)
          await runLocalRaffleAnimation(raffleOrder);

          // Mark animation as completed for this room (prevents double runs on remount)
          roomAnimationCompleted.set(room.id, true);

          console.log("[Client] Animation complete, attempting to start draft...");

          // Small delay to let other clients finish animation
          await sleep(1500);

          // Try to start the draft via RPC - anyone can call, server handles atomicity
          const { data: startResult, error: startError } = await supabase
            .rpc("start_draft_if_ready", { p_room_id: room.id });

          if (startError) {
            console.error("[Client] Error calling start_draft_if_ready:", startError);
          } else {
            console.log("[Client] start_draft_if_ready result:", startResult);
          }

          // Whether we started it or someone else did, poll for status change
          console.log("[Client] Polling for status change...");
          for (let i = 0; i < 20; i++) { // Poll for up to 10 seconds
            await sleep(500);
            const { data: statusData } = await supabase
              .from("draft_rooms_public")
              .select("status")
              .eq("id", room.id)
              .single();

            if (statusData?.status === "drafting") {
              console.log("[Client] Status is drafting, navigating...");
              navigate(`/draft/${roomCode}`);
              return;
            }
          }
          console.error("[Client] Timed out waiting for status to change to drafting");
          return;
        }

        await sleep(300);
      }

      console.error("[Client] Order not found - this should not happen with new drafts");
    };

    fetchAndAnimate();

    return () => { cancelled = true; };
  }, [allCaptainsConnected, room?.id, rafflePhase, isCreator, runLocalRaffleAnimation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!room) return null;

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
          <div className="font-bold mb-2 text-yellow-400">Debug</div>
          <div>Phase: {rafflePhase}</div>
          <div>Countdown: {countdown}</div>
          <div>Connected: [{Array.from(connectedCaptainNumbers).join(', ')}]</div>
          <div>Order: [{raffleOrder.join(', ')}]</div>
          <div>Creator: {isCreator ? 'YES' : 'NO'}</div>
          <div>Session: {sessionId ? sessionId.slice(0, 20) + '...' : 'NONE'}</div>
          <div>Realtime: {realtimeStatus}</div>
        </div>
      )}

      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>{t("waiting.back")}</span>
        </Link>
        <img src="/logo.png" alt="Draft Pick" className="h-8 w-auto" />
        <button
          onClick={() => setSoundMuted(toggleMute())}
          className="text-white/60 hover:text-white transition-colors p-1"
          title={soundMuted ? t("waiting.enableSounds") : t("waiting.muteSounds")}
        >
          {soundMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </header>

      <main className="px-4 py-8 max-w-2xl mx-auto">
        {/* Raffle Overlay */}
        <AnimatePresence>
          {rafflePhase !== "waiting" && (
            <motion.div
              key="raffle-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/95 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card rounded-2xl p-8 shadow-2xl border border-border max-w-md w-full text-center"
              >
                {/* COUNTDOWN */}
                {rafflePhase === "countdown" && (
                  <>
                    <PartyPopper className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-green-500 mb-2">{t("waiting.allConnected")}</h2>
                    <p className="text-muted-foreground mb-6">{t("waiting.raffle.title")}</p>
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-xl"
                    >
                      <span className="text-7xl font-bold text-white">{countdown}</span>
                    </motion.div>
                  </>
                )}

                {/* SHUFFLING */}
                {rafflePhase === "shuffling" && (
                  <>
                    {/* Rapid hand shuffle */}
                    <div className="flex justify-center gap-2 mb-4">
                      {shuffleHands.map((handImg, idx) => (
                        <motion.img
                          key={idx}
                          src={handImg}
                          alt="hand"
                          className="w-20 h-20 object-contain"
                          animate={{
                            rotate: [-5, 5, -5],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 0.15,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                    <h2 className="text-2xl font-bold mb-6">{t("waiting.raffle.title")}</h2>
                    <div className="flex justify-center gap-3">
                      {shuffleDisplay.map((num, idx) => (
                        <motion.div
                          key={`s-${idx}`}
                          animate={{ y: [0, -12, 0] }}
                          transition={{ duration: 0.3, delay: idx * 0.1, repeat: Infinity }}
                          className={`w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${getCaptainColor(num)}`}
                        >
                          {num}
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}

                {/* RESULT */}
                {(rafflePhase === "result" || rafflePhase === "starting") && (
                  <>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                      className="mb-4"
                    >
                      <Trophy className="h-14 w-14 text-yellow-500 mx-auto" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">{t("waiting.raffle.result")}</h2>
                    <p className="text-muted-foreground text-sm mb-4">{t("waiting.raffle.snakeDescription")}</p>

                    <div className="space-y-2 mb-4">
                      {raffleOrder.map((captainNum, idx) => (
                        <motion.div
                          key={`r-${captainNum}`}
                          initial={{ x: -30, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: idx * 0.2 }}
                          className={`flex items-center gap-3 p-3 rounded-xl ${getCaptainColor(captainNum)} text-white`}
                        >
                          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-semibold flex-1 text-left">
                            {getCaptainName(captainNum)}
                          </span>
                          {idx === 0 && (
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{t("waiting.raffle.first")}</span>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                      <p>{t("waiting.raffle.roundLabel", { round: 1 })}: {raffleOrder.join(" -> ")}</p>
                      <p>{t("waiting.raffle.roundLabel", { round: 2 })}: {[...raffleOrder].reverse().join(" -> ")}</p>
                    </div>

                    {rafflePhase === "starting" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-center gap-2 text-primary">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{t("waiting.startingDraft")}</span>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Room Info */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">{room.draft_name}</h1>
            <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/10">
              <span className="text-white/60">{t("waiting.code")}:</span>
              <span className="font-mono font-bold text-2xl text-white">{room.room_code}</span>
              <Button size="sm" onClick={copyRoomCode} className="bg-white/20 hover:bg-white/30 text-white">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div>
              <Button onClick={shareViaWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
                <Share2 className="h-4 w-4 mr-2" />
                {t("waiting.shareWhatsApp")}
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className={`rounded-xl p-4 text-center ${allCaptainsConnected ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-amber-500/10 border border-amber-500/30"}`}>
            <div className="flex items-center justify-center gap-2 text-lg font-medium">
              {allCaptainsConnected ? (
                <>
                  <Wifi className="h-5 w-5 text-emerald-400" />
                  <span className="text-emerald-400">{t("waiting.allConnected")}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-amber-400 animate-pulse" />
                  <span className="text-white">{t("waiting.waitingForCaptains", { connected: connectedCount })}</span>
                </>
              )}
            </div>
          </div>

          {/* Captains */}
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h2 className="font-semibold mb-4 flex items-center gap-2 text-white">
              <Crown className="h-5 w-5 text-amber-400" />
              {t("waiting.captainsStatus")}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {captainsInfo.map((captain) => (
                <div key={captain!.captainNumber} className="text-center">
                  <div className="relative inline-block">
                    <PlayerAvatar name={captain!.name} photoUrl={captain!.photoUrl} size="lg" />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-emerald-900 flex items-center justify-center ${captain!.isConnected ? "bg-emerald-500" : "bg-white/20"}`}>
                      {captain!.isConnected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                  <p className="font-medium text-sm mt-2 text-white">{captain!.name}</p>
                  <span className={`text-xs ${captain!.isConnected ? "text-emerald-400" : "text-white/50"}`}>
                    {captain!.isConnected ? t("waiting.captainReady") : t("waiting.captainWaiting")}
                  </span>
                  <div className={`mt-2 h-1 w-12 mx-auto rounded ${getCaptainColor(captain!.captainNumber)}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Players count */}
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-white/60" />
                <span className="text-white/60">{t("waiting.playersLabel")}:</span>
              </div>
              <span className="font-bold text-lg text-white">{players.filter((p) => !p.is_captain).length}</span>
            </div>
          </div>

          {!allCaptainsConnected && (
            <p className="text-center text-white/60">{t("waiting.shareToJoin")}</p>
          )}
        </motion.div>
      </main>
      </div>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
