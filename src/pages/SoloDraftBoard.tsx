import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClubContext } from "@/hooks/useClubContext";
import { useToast } from "@/hooks/use-toast";
import {
  generateRaffleOrder,
  generateSnakeDraftOrder,
  getTeamGridClass,
  getTeamConfig,
  getCaptainColor,
} from "@/lib/draftUtils";
import {
  ArrowLeft,
  Loader2,
  Volume2,
  VolumeX,
  Undo2,
  Check,
  UserPlus,
  X,
  Zap,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import {
  playSound,
  playRandomCrowd,
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
  DraggablePlayerChip,
  DroppableTeamZone,
} from "@/components/draft";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/ui/logo";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

interface SoloPlayer {
  id: string;
  name: string;
  photoUrl: string | null;
  category?: string;
  isGuest?: boolean;
  teamNumber: number | null;
  pickOrder: number | null;
}

interface Announcement {
  id: string;
  pickerName: string;
  playerName: string;
  isMe: boolean;
}

type SoloStep = "select" | "build";
type BuildMode = "draft" | "free";

function truncateName(name: string, maxLength = 9): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "...";
}

function generateAnnouncementId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const TEAM_EMOJIS = ["", "\u{1F535}", "\u{1F534}", "\u{1F7E1}", "\u{1F7E2}", "\u{1F7E3}"];

/** Droppable zone for the player pool — allows dragging players back from teams */
function DroppablePoolZone({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: "pool" });
  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 rounded-xl ${isOver ? "ring-2 ring-gray-400 bg-gray-50" : ""}`}
    >
      {children}
    </div>
  );
}

export default function SoloDraftBoard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("draft");
  const { user, loading: authLoading } = useAuth();
  const { currentClub, permissions, loading: clubLoading } = useClubContext();

  // Step management
  const [step, setStep] = useState<SoloStep>("select");
  // Solo draft is drag-and-drop only. The "draft" snake-pick mode is still
  // implemented below but no longer reachable from the UI.
  const [buildMode, setBuildMode] = useState<BuildMode>("free");
  void setBuildMode;

  // Player selection state (step: select)
  const [allPlayers, setAllPlayers] = useState<SoloPlayer[]>([]);
  const [guestPlayers, setGuestPlayers] = useState<SoloPlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [numTeams, setNumTeams] = useState(2);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [showAddGuest, setShowAddGuest] = useState(false);

  // Build state (step: build)
  const [players, setPlayers] = useState<SoloPlayer[]>([]);
  const [draftOrder, setDraftOrder] = useState<number[]>([]);
  const [currentPickIndex, setCurrentPickIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<SoloPlayer | null>(null);
  const [selectedFreePlayer, setSelectedFreePlayer] = useState<SoloPlayer | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [soundMuted, setSoundMuted] = useState(isMuted);

  // Draft name for sharing
  const [draftName, setDraftName] = useState("");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // Track pick history for undo (draft mode)
  const pickHistoryRef = useRef<{ playerId: string; pickIndex: number }[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !clubLoading) {
      if (!user) {
        navigate("/");
      } else if (!permissions.canCreateDrafts) {
        navigate("/dashboard");
      }
    }
  }, [user, authLoading, clubLoading, permissions, navigate]);

  // Fetch club players on mount
  useEffect(() => {
    if (user && !clubLoading && currentClub) {
      fetchPlayers();
    }
  }, [user, clubLoading, currentClub?.id]);

  useEffect(() => {
    preloadSounds();
  }, []);

  const fetchPlayers = async () => {
    try {
      if (!currentClub) return;

      const { data, error } = await supabase.rpc("get_club_players", {
        p_club_id: currentClub.id,
      });

      if (error) throw error;

      const mapped: SoloPlayer[] = (data || []).map((p: { id: string; name: string; photo_url: string | null; category?: string }) => ({
        id: p.id,
        name: p.name,
        photoUrl: p.photo_url,
        category: p.category,
        teamNumber: null,
        pickOrder: null,
      }));

      setAllPlayers(mapped);
    } catch (err) {
      console.error("Error fetching players:", err);
    } finally {
      setLoading(false);
    }
  };

  // Combined list
  const combinedPlayers = useMemo(() => [...allPlayers, ...guestPlayers], [allPlayers, guestPlayers]);

  // Team config
  const { minPlayers } = getTeamConfig(numTeams);

  const canContinue = selectedPlayerIds.length >= minPlayers;

  // --- Player Selection Helpers ---

  const addGuest = () => {
    const trimmedName = guestName.trim();
    if (!trimmedName) return;

    const exists = combinedPlayers.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      toast({
        title: t("create.guest.duplicate"),
        description: t("create.guest.duplicateDescription"),
        variant: "destructive",
      });
      return;
    }

    const guestId = `guest-${Date.now()}`;
    const newGuest: SoloPlayer = {
      id: guestId,
      name: trimmedName,
      photoUrl: null,
      isGuest: true,
      teamNumber: null,
      pickOrder: null,
    };

    setGuestPlayers((prev) => [...prev, newGuest]);
    setSelectedPlayerIds((prev) => [...prev, guestId]);
    setGuestName("");
    setShowAddGuest(false);
  };

  const removeGuest = (guestId: string) => {
    setGuestPlayers((prev) => prev.filter((p) => p.id !== guestId));
    setSelectedPlayerIds((prev) => prev.filter((id) => id !== guestId));
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const selectAll = () => {
    setSelectedPlayerIds([...allPlayers.map((p) => p.id), ...guestPlayers.map((p) => p.id)]);
  };

  const selectRegulars = () => {
    const regularIds = allPlayers
      .filter((p) => p.category === "regular" || !p.category)
      .map((p) => p.id);
    const selectedGuestIds = guestPlayers
      .filter((g) => selectedPlayerIds.includes(g.id))
      .map((g) => g.id);
    setSelectedPlayerIds([...regularIds, ...selectedGuestIds]);
  };

  const deselectAll = () => {
    setSelectedPlayerIds([]);
  };

  // --- Transition to Build Step ---

  const startBuild = () => {
    const selected = combinedPlayers.filter((p) => selectedPlayerIds.includes(p.id));
    const buildPlayers: SoloPlayer[] = selected.map((p) => ({
      ...p,
      teamNumber: null,
      pickOrder: null,
    }));

    setPlayers(buildPlayers);

    // Generate draft order for snake mode
    const raffleOrder = generateRaffleOrder(numTeams);
    const totalPicks = buildPlayers.length;
    const order = generateSnakeDraftOrder(totalPicks, raffleOrder);
    setDraftOrder(order);
    setCurrentPickIndex(0);
    pickHistoryRef.current = [];
    setSelectedPlayer(null);
    setSelectedFreePlayer(null);

    // Auto-generate draft name from date
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    setDraftName(`${dayName} Teams`);

    setStep("build");
  };

  // --- Build Step: Derived State ---

  const availablePlayers = players.filter((p) => p.teamNumber === null);
  const totalPicks = players.length;
  const assignedCount = players.filter((p) => p.teamNumber !== null).length;
  const allAssigned = availablePlayers.length === 0 && players.length > 0;

  const currentCaptainNumber = draftOrder.length > 0 ? draftOrder[currentPickIndex] : 1;

  // Teams for display
  const teams = useMemo(() => {
    return Array.from({ length: numTeams }, (_, i) => {
      const num = i + 1;
      const teamPlayers = players
        .filter((p) => p.teamNumber === num)
        .sort((a, b) => (a.pickOrder || 0) - (b.pickOrder || 0));

      return {
        number: num,
        captainName: t("solo.team", { number: num }),
        captainPhotoUrl: null as string | null,
        players: teamPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          photoUrl: p.photoUrl,
        })),
      };
    });
  }, [players, numTeams, t]);

  // --- Draft Mode Handlers ---

  const handleSelectPlayerDraft = (player: SoloPlayer) => {
    if (allAssigned) return;
    setSelectedPlayer(player);
  };

  const handleConfirmPickDraft = () => {
    if (!selectedPlayer || draftOrder.length === 0) return;

    const captainNum = draftOrder[currentPickIndex];
    const pickNumber = currentPickIndex + 1;

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === selectedPlayer.id
          ? { ...p, teamNumber: captainNum, pickOrder: pickNumber }
          : p
      )
    );

    pickHistoryRef.current.push({
      playerId: selectedPlayer.id,
      pickIndex: currentPickIndex,
    });

    playRandomCrowd();
    setAnnouncement({
      id: generateAnnouncementId(),
      pickerName: t("solo.team", { number: captainNum }),
      playerName: truncateName(selectedPlayer.name),
      isMe: true,
    });

    setSelectedPlayer(null);

    const newPickIndex = currentPickIndex + 1;
    if (newPickIndex >= totalPicks) {
      // All assigned — play whistle, "Done" button will appear
      setTimeout(() => {
        playSound("whistle.mp3");
      }, 1500);
    } else {
      setCurrentPickIndex(newPickIndex);
    }
  };

  const handleUndoDraft = () => {
    if (pickHistoryRef.current.length === 0) return;

    const lastPick = pickHistoryRef.current.pop()!;

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === lastPick.playerId
          ? { ...p, teamNumber: null, pickOrder: null }
          : p
      )
    );

    setCurrentPickIndex(lastPick.pickIndex);
  };

  // --- Free Drag & Drop Mode ---

  // DnD sensors: pointer (desktop) + touch (mobile) with distance threshold
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 8 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Active drag state for overlay
  const [activeDragPlayer, setActiveDragPlayer] = useState<SoloPlayer | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const playerId = event.active.id as string;
    const player = players.find((p) => p.id === playerId);
    if (player) setActiveDragPlayer(player);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPlayer(null);
    const { active, over } = event;
    if (!over) return;

    const playerId = active.id as string;
    const overId = over.id as string;

    // Dropped on pool → unassign
    if (overId === "pool") {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, teamNumber: null, pickOrder: null } : p
        )
      );
      return;
    }

    // Dropped on team-N → assign/reassign
    if (overId.startsWith("team-")) {
      const teamNumber = parseInt(overId.replace("team-", ""), 10);
      const player = players.find((p) => p.id === playerId);
      if (!player || player.teamNumber === teamNumber) return; // same team = no-op

      const pickNum = assignedCount + 1;
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId
            ? { ...p, teamNumber, pickOrder: pickNum }
            : p
        )
      );
    }
  };

  // Tap-to-unassign: click an assigned player in a team to return to pool
  const handleUnassignPlayer = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, teamNumber: null, pickOrder: null } : p
      )
    );
  };

  // Reset all team assignments in free mode
  const handleResetTeams = () => {
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, teamNumber: null, pickOrder: null }))
    );
  };

  // --- Save & Redirect ---

  const handleSaveAndRedirect = async () => {
    if (!currentClub) return;

    setSaving(true);
    try {
      const payload = players
        .filter((p) => p.teamNumber !== null)
        .map((p) => ({
          player_id: p.isGuest ? null : p.id,
          guest_name: p.isGuest ? p.name : null,
          team_number: p.teamNumber,
          pick_order: p.pickOrder,
        }));

      const { data: roomCode, error } = await supabase.rpc("save_solo_draft", {
        p_draft_name: draftName,
        p_club_id: currentClub.id,
        p_num_teams: numTeams,
        p_players: payload,
      });

      if (error) throw error;

      // Auto-set each team's captain to its first-picked non-guest player.
      // This unlocks the "John's Sharks" team naming. Owner can override via
      // Results page later if they don't like the auto-pick.
      const firstPickByTeam = new Map<number, string>();
      [...players]
        .filter((p) => p.teamNumber !== null && !p.isGuest && p.pickOrder !== null)
        .sort((a, b) => (a.pickOrder ?? 0) - (b.pickOrder ?? 0))
        .forEach((p) => {
          if (p.teamNumber !== null && !firstPickByTeam.has(p.teamNumber)) {
            firstPickByTeam.set(p.teamNumber, p.id);
          }
        });

      const captainsArray = Array.from({ length: numTeams }, (_, i) =>
        firstPickByTeam.get(i + 1) ?? null
      );

      if (captainsArray.some((c) => c !== null)) {
        await supabase
          .from("draft_rooms")
          .update({ captains: captainsArray })
          .eq("room_code", roomCode);
      }

      navigate(`/results/${roomCode}`);
    } catch (err) {
      console.error("Error saving solo draft:", err);
      toast({
        title: t("solo.saveError"),
        variant: "destructive",
      });
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const handleShareFallback = () => {
    const lines: string[] = [];
    lines.push(`\u26BD *${draftName}*`);
    lines.push("");
    for (let i = 1; i <= numTeams; i++) {
      const emoji = TEAM_EMOJIS[i] || "\u26AA";
      const teamPlayers = players
        .filter((p) => p.teamNumber === i)
        .sort((a, b_) => (a.pickOrder || 0) - (b_.pickOrder || 0));
      lines.push(`${emoji} *Team ${i}:*`);
      teamPlayers.forEach((p, idx) => {
        lines.push(`${idx + 1}. ${p.name}`);
      });
      lines.push("");
    }
    lines.push(`\u26A1 ${t("solo.fairTeams")}`);
    const text = lines.join("\n");
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // --- Mode Switch ---

  const handleModeSwitch = (mode: BuildMode) => {
    setBuildMode(mode);
    setSelectedPlayer(null);
    setSelectedFreePlayer(null);
    setActiveDragPlayer(null);

    // When switching to draft mode, recalculate currentPickIndex based on assigned players
    if (mode === "draft") {
      const assigned = players.filter((p) => p.teamNumber !== null).length;
      setCurrentPickIndex(assigned);
    }
  };

  // --- Loading ---

  if (authLoading || clubLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  // --- Render: Select Step ---

  if (step === "select") {
    const regulars = allPlayers.filter((p) => p.category === "regular" || !p.category);
    const occasionals = allPlayers.filter((p) => p.category === "occasional");

    return (
      <div className="min-h-screen bg-background bg-mesh-light">
        {/* Header */}
        <header className="p-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("solo.back")}</span>
          </Link>
          <Logo size="md" />
        </header>

        <main className="px-4 py-8 max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              <Zap className="inline h-6 w-6 mr-2 text-primary" />
              {t("solo.title")}
            </h1>
            <p className="text-muted-foreground">{t("solo.subtitle")}</p>
          </div>

          {/* Team Count Selector */}
          <div className="bg-card shadow-card rounded-xl p-6 border border-border space-y-3">
            <label className="text-foreground/80 text-sm font-medium">{t("solo.teamCount")}</label>
            <div className="grid grid-cols-2 gap-3">
              {[2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumTeams(n)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    numTeams === n
                      ? "border-primary bg-primary/15"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <span className="text-lg font-bold text-foreground">
                    {t(`create.teamCount.${n === 2 ? "two" : "three"}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Player Selection */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              {t("create.playersStep.selected", { count: selectedPlayerIds.length })} ({t("create.playersStep.required", { min: minPlayers, max: 30 })})
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 justify-center flex-wrap">
            <Button size="sm" onClick={selectRegulars} className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/30">
              {t("create.playersStep.selectRegulars")}
            </Button>
            <Button size="sm" onClick={selectAll} className="bg-muted hover:bg-muted/80 text-foreground border-border">
              {t("create.playersStep.selectAll")}
            </Button>
            <Button size="sm" onClick={deselectAll} className="bg-muted hover:bg-muted/80 text-foreground border-border">
              {t("create.playersStep.deselectAll")}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddGuest(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 border-amber-500/30"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              {t("create.guest.addGuest")}
            </Button>
          </div>

          {/* Add Guest Form */}
          {showAddGuest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30"
            >
              <div className="flex gap-2">
                <Input
                  placeholder={t("create.guest.namePlaceholder")}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGuest()}
                  className="flex-1 h-10"
                  maxLength={30}
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={addGuest}
                  disabled={!guestName.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowAddGuest(false);
                    setGuestName("");
                  }}
                  className="bg-muted hover:bg-muted/80 text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-amber-700/70 mt-2">
                {t("create.guest.oneTimeNote")}
              </p>
            </motion.div>
          )}

          {/* Player List */}
          <div className="bg-card shadow-card rounded-xl p-4 border border-border space-y-4">
            {regulars.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  {t("create.playersStep.regular")} ({regulars.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {regulars.map((player) => (
                    <label
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPlayerIds.includes(player.id)
                          ? "bg-primary/15 border-2 border-primary"
                          : "bg-card border-2 border-border hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={selectedPlayerIds.includes(player.id)}
                        onCheckedChange={() => togglePlayer(player.id)}
                      />
                      <PlayerAvatar
                        name={player.name}
                        photoUrl={player.photoUrl}
                        size="sm"
                      />
                      <span className="text-sm font-medium text-foreground truncate">
                        {player.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {occasionals.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  {t("create.playersStep.occasional")} ({occasionals.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {occasionals.map((player) => (
                    <label
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPlayerIds.includes(player.id)
                          ? "bg-primary/15 border-2 border-primary"
                          : "bg-card border-2 border-border hover:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={selectedPlayerIds.includes(player.id)}
                        onCheckedChange={() => togglePlayer(player.id)}
                      />
                      <PlayerAvatar
                        name={player.name}
                        photoUrl={player.photoUrl}
                        size="sm"
                      />
                      <span className="text-sm font-medium text-foreground truncate">
                        {player.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Guest Players */}
            {guestPlayers.length > 0 && (
              <div>
                <p className="text-xs text-amber-700/50 mb-2 font-medium">
                  {t("create.guest.guests")} ({guestPlayers.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {guestPlayers.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                        selectedPlayerIds.includes(player.id)
                          ? "bg-amber-500/20 border-2 border-amber-400"
                          : "bg-amber-500/10 border-2 border-amber-500/30"
                      }`}
                    >
                      <Checkbox
                        checked={selectedPlayerIds.includes(player.id)}
                        onCheckedChange={() => togglePlayer(player.id)}
                      />
                      <PlayerAvatar name={player.name} photoUrl={null} size="sm" />
                      <span className="text-sm font-medium text-amber-700 truncate flex-1">
                        {player.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeGuest(player.id)}
                        className="text-amber-500/60 hover:text-amber-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Spacer for sticky bottom */}
          <div className="h-20" />

          {/* Sticky Continue Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-30">
            <div className="max-w-2xl mx-auto">
              <Button
                onClick={startBuild}
                disabled={!canContinue}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {t("solo.continue")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Render: Build Step ---

  if (step === "build") {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Header */}
        <header className="px-3 py-2 flex items-center justify-between border-b border-purple-700 bg-purple-800">
          <button
            onClick={() => setStep("select")}
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>{t("solo.back")}</span>
          </button>
          <Logo size="sm" variant="light" />
          <div className="flex items-center gap-2">
            {buildMode === "draft" && (
              <button
                onClick={() => setSoundMuted(toggleMute())}
                className="text-white/60 hover:text-white transition-colors"
                title={soundMuted ? t("board.enableSounds") : t("board.muteSounds")}
              >
                {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-3 py-2 flex flex-col lg:px-6 lg:py-3">
          {/* Hint banner */}
          <div className={`text-center py-2 px-4 rounded-lg mb-1 ${
            allAssigned
              ? "bg-green-100 text-green-700 font-medium"
              : "bg-gray-200 text-gray-600"
          }`}>
            {allAssigned ? t("solo.allAssigned") : t("solo.dragHint")}
          </div>

          {/* Progress Bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${totalPicks > 0 ? (assignedCount / totalPicks) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
              {assignedCount}/{totalPicks}
            </span>
          </div>

          {/* --- DRAFT MODE: Standard pick flow --- */}
          {buildMode === "draft" && (
            <div className="mt-3 flex-1 lg:grid lg:grid-cols-[1fr,320px] lg:gap-4 xl:grid-cols-[1fr,380px]">
              {/* Available Players Pool */}
              <div className="order-2 lg:order-1 mt-4 lg:mt-0 pb-20">
                <div className="text-base font-semibold mb-3 text-gray-800">
                  {t("solo.availablePlayers", { count: availablePlayers.length })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  <AnimatePresence mode="popLayout">
                    {availablePlayers.map((player) => (
                      <motion.div
                        key={player.id}
                        layout="position"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{
                          layout: { type: "spring", stiffness: 200, damping: 25 },
                          opacity: { duration: 0.2 },
                        }}
                      >
                        <PlayerChip
                          name={player.name}
                          photoUrl={player.photoUrl}
                          size="md"
                          state="highlighted"
                          onClick={() => handleSelectPlayerDraft(player)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Teams sidebar */}
              <div className="order-1 lg:order-2">
                <div className={`grid ${getTeamGridClass(numTeams)} gap-2 lg:grid-cols-1 lg:gap-3`}>
                  {teams.map((team) => (
                    <TeamColumn
                      key={team.number}
                      captainNumber={team.number}
                      captainName={team.captainName}
                      captainPhotoUrl={team.captainPhotoUrl}
                      players={team.players}
                      isActive={currentCaptainNumber === team.number}
                      totalPlayersInDraft={totalPicks}
                      numTeams={numTeams}
                      hideCaptainChip
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- FREE DRAG & DROP MODE --- */}
          {buildMode === "free" && (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="mt-3 flex-1 lg:grid lg:grid-cols-[1fr,320px] lg:gap-4 xl:grid-cols-[1fr,380px]">
                {/* Available Players Pool (droppable — for returning players) */}
                <DroppablePoolZone>
                  <div className="order-2 lg:order-1 mt-4 lg:mt-0 pb-20">
                    <div className="text-base font-semibold mb-3 text-gray-800">
                      {t("solo.availablePlayers", { count: availablePlayers.length })}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      <AnimatePresence mode="popLayout">
                        {availablePlayers.map((player) => (
                          <motion.div
                            key={player.id}
                            layout="position"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{
                              layout: { type: "spring", stiffness: 200, damping: 25 },
                              opacity: { duration: 0.2 },
                            }}
                          >
                            <DraggablePlayerChip
                              id={player.id}
                              name={player.name}
                              photoUrl={player.photoUrl}
                              size="md"
                              state="highlighted"
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </DroppablePoolZone>

                {/* Teams sidebar — droppable zones */}
                <div className="order-1 lg:order-2">
                  <div className={`grid ${getTeamGridClass(numTeams)} gap-2 lg:grid-cols-1 lg:gap-3`}>
                    {teams.map((team) => (
                      <DroppableTeamZone
                        key={team.number}
                        teamNumber={team.number}
                        captainName={team.captainName}
                        captainPhotoUrl={team.captainPhotoUrl}
                        players={team.players}
                        isActive={false}
                        totalPlayersInDraft={totalPicks}
                        numTeams={numTeams}
                        onPlayerClick={handleUnassignPlayer}
                        draggable
                        hideCaptainChip
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Drag overlay — floating ghost chip */}
              <DragOverlay dropAnimation={null}>
                {activeDragPlayer ? (
                  <div className="opacity-90">
                    <PlayerChip
                      name={activeDragPlayer.name}
                      photoUrl={activeDragPlayer.photoUrl}
                      size="md"
                      state="selected"
                      className="shadow-xl scale-105"
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </main>

        {/* Undo Button — draft mode only */}
        {buildMode === "draft" && (
          <AnimatePresence>
            {pickHistoryRef.current.length > 0 && !allAssigned && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={handleUndoDraft}
                className="fixed bottom-4 left-4 z-30 flex items-center gap-2 px-4 py-2.5 bg-white shadow-lg rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Undo2 className="h-4 w-4" />
                <span className="text-sm font-medium">{t("solo.undoLastPick")}</span>
              </motion.button>
            )}
          </AnimatePresence>
        )}

        {/* Reset Teams Button — free mode only */}
        {buildMode === "free" && assignedCount > 0 && !allAssigned && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleResetTeams}
            className="fixed bottom-4 left-4 z-30 flex items-center gap-2 px-4 py-2.5 bg-white shadow-lg rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm font-medium">{t("solo.resetTeams")}</span>
          </motion.button>
        )}

        {/* Done Button — shows when all assigned */}
        {allAssigned && (
          <div className="fixed bottom-4 right-4 z-30 flex gap-2">
            {saving ? (
              <Button
                disabled
                className="bg-primary text-primary-foreground shadow-lg px-6"
              >
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("solo.saving")}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleSaveAndRedirect}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-6"
                >
                  {t("solo.done")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                {saveFailed && (
                  <Button
                    onClick={handleShareFallback}
                    variant="outline"
                    className="bg-white/90 text-gray-700 shadow-lg px-4"
                  >
                    {t("solo.shareWithoutSaving")}
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Confirmation Modal — draft mode only */}
        <AnimatePresence>
          {buildMode === "draft" && selectedPlayer && (
            <ConfirmPickModal
              playerName={selectedPlayer.name}
              playerPhotoUrl={selectedPlayer.photoUrl}
              captainNumber={currentCaptainNumber}
              onConfirm={handleConfirmPickDraft}
              onCancel={() => setSelectedPlayer(null)}
            />
          )}
        </AnimatePresence>

        {/* Pick Announcement — draft mode only */}
        <AnimatePresence mode="wait">
          {announcement && (
            <PickAnnouncement
              key={announcement.id}
              id={announcement.id}
              pickerName={announcement.pickerName}
              playerName={announcement.playerName}
              isMe={announcement.isMe}
              onComplete={() => setAnnouncement(null)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // This should never render — build step covers all states
  return null;
}
