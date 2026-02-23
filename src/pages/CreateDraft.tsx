import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useClubContext } from "@/hooks/useClubContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateRoomCode, generateRaffleOrder, generateSnakeDraftOrder, getTeamConfig } from "@/lib/draftUtils";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Users,
  Crown,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText,
  UserPlus,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/ui/logo";

interface Player {
  id: string;
  name: string;
  photo_url: string | null;
  category?: string; // 'regular' or 'occasional'
  isGuest?: boolean; // true for guests added during draft creation
}

type Step = "name" | "players" | "captains" | "confirm";

interface RemakeState {
  remake?: boolean;
  draftName?: string;
  location?: string;
  notes?: string;
  playerIds?: string[];
  captainIds?: string[];
}

export default function CreateDraft() {
  const { user, loading: authLoading } = useAuth();
  const { currentClub, isOwner, permissions, loading: clubLoading } = useClubContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const routerLocation = useLocation();
  const remakeState = routerLocation.state as RemakeState | null;
  const { t } = useTranslation("draft");

  const [step, setStep] = useState<Step>("name");
  const [numTeams, setNumTeams] = useState(3);
  const [draftName, setDraftName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [guestPlayers, setGuestPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [captainIds, setCaptainIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState<"all" | "even">("all");

  useEffect(() => {
    if (!authLoading && !clubLoading) {
      if (!user) {
        navigate("/");
      } else if (!permissions.canCreateDrafts) {
        navigate("/dashboard");
      }
    }
  }, [user, authLoading, clubLoading, permissions, navigate]);

  useEffect(() => {
    if (user && !clubLoading && currentClub) {
      fetchPlayers();
    }
  }, [user, clubLoading, currentClub?.id]);

  const fetchPlayers = async () => {
    setFetchError(null);
    try {
      let data: Player[] = [];

      // Try RPC first (works for both owners and permitted members)
      if (currentClub) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_club_players", {
          p_club_id: currentClub.id,
        });

        if (!rpcError && rpcData) {
          data = rpcData;
        } else if (isOwner) {
          // Fallback to direct query — only works for owners (RLS: auth.uid() = user_id)
          const { data: fallbackData, error } = await supabase
            .from("user_players")
            .select("*")
            .eq("user_id", user?.id)
            .order("name");

          if (error) throw error;
          data = fallbackData || [];
        } else {
          // Member: RPC failed — likely not linked properly
          console.error("get_club_players failed for member:", rpcError?.message);
          setFetchError("member_access_denied");
        }
      } else {
        // No club yet — direct query
        const { data: fallbackData, error } = await supabase
          .from("user_players")
          .select("*")
          .eq("user_id", user?.id)
          .order("name");

        if (error) throw error;
        data = fallbackData || [];
      }

      setAllPlayers(data);

      // Apply remake state if available
      if (remakeState?.remake) {
        if (remakeState.draftName) setDraftName(remakeState.draftName + " (remake)");
        if (remakeState.location) setLocation(remakeState.location);
        if (remakeState.notes) setNotes(remakeState.notes);

        // Pre-select players that exist in pool
        if (remakeState.playerIds && data) {
          const validPlayerIds = remakeState.playerIds.filter((id) =>
            data.some((p) => p.id === id)
          );
          setSelectedPlayerIds(validPlayerIds as string[]);
        }

        // Pre-select captains
        if (remakeState.captainIds) {
          setCaptainIds(remakeState.captainIds as string[]);
        }

        // Show details if location/notes exist
        if (remakeState.location || remakeState.notes) {
          setShowDetails(true);
        }
      } else if (isOwner) {
        // Fetch club defaults only for new drafts (owners only)
        const { data: clubData } = await supabase.rpc("get_user_club");
        if (clubData) {
          setLocation(clubData.default_location || "");
          setNotes(clubData.default_notes || "");
        }
      }
    } catch (err) {
      console.error("Error fetching players:", err);
    } finally {
      setLoading(false);
    }
  };

  // Combined list of pool players + guests
  const combinedPlayers = [...allPlayers, ...guestPlayers];

  const selectedPlayers = combinedPlayers.filter((p) =>
    selectedPlayerIds.includes(p.id)
  );

  const captains = combinedPlayers.filter((p) => captainIds.includes(p.id));

  const addGuest = () => {
    const trimmedName = guestName.trim();
    if (!trimmedName) return;

    // Check for duplicate names
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
    const newGuest: Player = {
      id: guestId,
      name: trimmedName,
      photo_url: null,
      isGuest: true,
    };

    setGuestPlayers((prev) => [...prev, newGuest]);
    setSelectedPlayerIds((prev) => [...prev, guestId]); // Auto-select the guest
    setGuestName("");
    setShowAddGuest(false);
  };

  const removeGuest = (guestId: string) => {
    setGuestPlayers((prev) => prev.filter((p) => p.id !== guestId));
    setSelectedPlayerIds((prev) => prev.filter((id) => id !== guestId));
    setCaptainIds((prev) => prev.filter((id) => id !== guestId));
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
    // Remove from captains if deselected
    if (selectedPlayerIds.includes(playerId)) {
      setCaptainIds((prev) => prev.filter((id) => id !== playerId));
    }
  };

  const toggleCaptain = (playerId: string) => {
    if (captainIds.includes(playerId)) {
      setCaptainIds((prev) => prev.filter((id) => id !== playerId));
    } else if (captainIds.length < NUM_TEAMS) {
      setCaptainIds((prev) => [...prev, playerId]);
    }
  };

  const selectAll = () => {
    setSelectedPlayerIds([...allPlayers.map((p) => p.id), ...guestPlayers.map((p) => p.id)]);
  };

  const selectRegulars = () => {
    const regularIds = allPlayers
      .filter((p) => p.category === 'regular' || !p.category) // treat null/undefined as regular (pre-migration)
      .map((p) => p.id);
    // Keep any already-selected guests
    const selectedGuestIds = guestPlayers.filter((g) => selectedPlayerIds.includes(g.id)).map((g) => g.id);
    setSelectedPlayerIds([...regularIds, ...selectedGuestIds]);
    // Remove captains that are no longer selected
    setCaptainIds((prev) => prev.filter((id) => regularIds.includes(id) || selectedGuestIds.includes(id)));
  };

  const deselectAll = () => {
    setSelectedPlayerIds([]);
    setCaptainIds([]);
  };

  // Draft configuration based on team count
  const { minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS } = getTeamConfig(numTeams);
  const NUM_TEAMS = numTeams;

  const canProceedToPlayers = draftName.trim().length >= 2;
  const canProceedToCaptains = selectedPlayerIds.length >= MIN_PLAYERS && selectedPlayerIds.length <= MAX_PLAYERS;
  const canProceedToConfirm = captainIds.length === NUM_TEAMS;

  const handleCreate = async () => {
    if (!user) return;

    setCreating(true);

    try {
      const roomCode = generateRoomCode();

      // When "even" mode is selected, drop the last non-captain player
      let effectivePlayerIds = [...selectedPlayerIds];
      if (draftMode === "even" && numTeams === 2) {
        const lastNonCaptainIndex = [...effectivePlayerIds]
          .reverse()
          .findIndex((id) => !captainIds.includes(id));
        if (lastNonCaptainIndex >= 0) {
          effectivePlayerIds.splice(
            effectivePlayerIds.length - 1 - lastNonCaptainIndex,
            1
          );
        }
      }

      // Pre-generate raffle order and snake draft order BEFORE any captains connect
      // This ensures all clients read the same predetermined order from the database
      const raffleOrder = generateRaffleOrder(numTeams);
      const totalPicks = effectivePlayerIds.length - NUM_TEAMS; // Non-captain players
      const draftOrder = generateSnakeDraftOrder(totalPicks, raffleOrder);

      // Create draft room with pre-generated draft order and raffle order
      const { data: room, error: roomError } = await supabase
        .from("draft_rooms")
        .insert({
          creator_user_id: user.id,
          draft_name: draftName.trim(),
          room_code: roomCode,
          captain1_player_id: captainIds[0] || null,
          captain2_player_id: captainIds[1] || null,
          captain3_player_id: captainIds[2] || null,
          num_teams: numTeams,
          captains: captainIds,
          status: "waiting",
          draft_order: draftOrder,
          raffle_order: raffleOrder,
          location: location.trim() || null,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add all players to draft room
      // Handle both pool players (with player_id) and guests (with guest_name)
      const draftPlayers = effectivePlayerIds.map((playerId) => {
        const player = combinedPlayers.find((p) => p.id === playerId);
        const isGuest = player?.isGuest || false;

        return {
          room_id: room.id,
          player_id: isGuest ? null : playerId,
          guest_name: isGuest ? player?.name : null,
          is_captain: captainIds.includes(playerId),
        };
      });

      const { error: playersError } = await supabase
        .from("draft_room_players")
        .insert(draftPlayers);

      if (playersError) throw playersError;

      toast({
        title: t("create.toast.created"),
        description: t("create.toast.roomCode", { code: roomCode }),
      });

      navigate(`/room/${roomCode}`);
    } catch (err) {
      console.error("Error creating draft:", err);
      toast({
        title: t("create.errors.createError"),
        description: t("create.errors.createFailed"),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const goNext = () => {
    if (step === "name" && canProceedToPlayers) setStep("players");
    else if (step === "players" && canProceedToCaptains) setStep("captains");
    else if (step === "captains" && canProceedToConfirm) setStep("confirm");
  };

  const goBack = () => {
    if (step === "players") setStep("name");
    else if (step === "captains") setStep("players");
    else if (step === "confirm") setStep("captains");
  };

  if (authLoading || clubLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh-light">
      <div>
        {/* Header */}
        <header className="p-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("create.back")}</span>
          </Link>
          <Logo size="md" />
        </header>

      <main className="px-4 py-8 max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {(["name", "players", "captains", "confirm"] as Step[]).map(
              (s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s
                        ? "bg-primary text-primary-foreground"
                        : (["name", "players", "captains", "confirm"] as Step[]).indexOf(
                            step
                          ) > i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {(["name", "players", "captains", "confirm"] as Step[]).indexOf(
                      step
                    ) > i ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-8 h-1 mx-1 ${
                        (["name", "players", "captains", "confirm"] as Step[]).indexOf(
                          step
                        ) > i
                          ? "bg-primary"
                          : "bg-border"
                      }`}
                    />
                  )}
                </div>
              )
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Draft Name */}
          {step === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t("create.title")}
                </h1>
                <p className="text-muted-foreground">{t("create.nameStep.hint")}</p>
              </div>

              {/* Team Count Selector */}
              <div className="bg-card shadow-card rounded-xl p-6 border border-border space-y-3">
                <Label className="text-foreground/80">{t("create.teamCount.title")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setNumTeams(n);
                        // Reset captains if we reduced team count
                        if (n < numTeams) setCaptainIds((prev) => prev.slice(0, n));
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        numTeams === n
                          ? "border-primary bg-primary/15"
                          : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      <span className="text-lg font-bold text-foreground">
                        {t(`create.teamCount.${n === 2 ? "two" : "three"}`)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(`create.teamCount.${n === 2 ? "twoDescription" : "threeDescription"}`)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-card shadow-card rounded-xl p-6 border border-border space-y-4">
                <div>
                  <Label htmlFor="draftName" className="text-foreground/80">{t("create.nameStep.label")}</Label>
                  <Input
                    id="draftName"
                    placeholder={t("create.nameStep.placeholder")}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="mt-2 h-12"
                    maxLength={50}
                  />
                </div>

                {/* Collapsible Details */}
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between text-muted-foreground hover:text-foreground/80 transition-colors py-2"
                >
                  <span className="text-sm">{t("create.nameStep.addDetails")}</span>
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-2 border-t border-border"
                  >
                    <div>
                      <Label htmlFor="location" className="text-foreground/80 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t("create.nameStep.location")}
                      </Label>
                      <Input
                        id="location"
                        placeholder={t("create.nameStep.locationPlaceholder")}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="mt-2 h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes" className="text-foreground/80 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t("create.nameStep.notes")}
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder={t("create.nameStep.notesPlaceholder")}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-2 resize-none"
                        rows={2}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              <Button
                onClick={goNext}
                disabled={!canProceedToPlayers}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {t("create.continue")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Select Players */}
          {step === "players" && (
            <motion.div
              key="players"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  <Users className="inline h-6 w-6 mr-2" />
                  {t("create.playersStep.title")}
                </h1>
                <p className="text-muted-foreground">
                  {t("create.playersStep.selected", { count: selectedPlayerIds.length })} ({t("create.playersStep.required", { min: MIN_PLAYERS, max: MAX_PLAYERS })})
                </p>
              </div>

              {fetchError === "member_access_denied" ? (
                <div className="bg-card shadow-card rounded-xl p-8 border border-border text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">
                    {t("create.errors.noAccess")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("create.errors.noAccessDescription")}
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                      onClick={() => { setLoading(true); fetchPlayers(); }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {t("create.errors.retry")}
                    </Button>
                    <Button asChild className="bg-muted hover:bg-muted/80 text-foreground border-border">
                      <Link to="/dashboard">{t("create.errors.backToDashboard")}</Link>
                    </Button>
                  </div>
                </div>
              ) : allPlayers.length === 0 && guestPlayers.length === 0 ? (
                <div className="bg-card shadow-card rounded-xl p-8 border border-border text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">
                    {t("create.errors.noPlayers")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("create.errors.noPlayersDescription")}
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button asChild className="bg-muted hover:bg-muted/80 text-foreground border-border">
                      <Link to="/players">{t("create.errors.addToLibrary")}</Link>
                    </Button>
                    <Button
                      onClick={() => setShowAddGuest(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("create.guest.addGuests")}
                    </Button>
                  </div>

                  {/* Add Guest Form - shown in empty state too */}
                  {showAddGuest && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 mt-4"
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
                      </div>
                    </motion.div>
                  )}

                  {/* Show added guests */}
                  {guestPlayers.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-muted-foreground text-sm">{t("create.guest.added", { count: guestPlayers.length })}</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {guestPlayers.map((guest) => (
                          <span
                            key={guest.id}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 rounded-full text-amber-700 text-sm"
                          >
                            {guest.name}
                            <button onClick={() => removeGuest(guest.id)}>
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
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

                  <div className="bg-card shadow-card rounded-xl p-4 border border-border space-y-4">
                    {/* Regular Players */}
                    {(() => {
                      const regulars = allPlayers.filter((p) => p.category === 'regular' || !p.category);
                      const occasionals = allPlayers.filter((p) => p.category === 'occasional');
                      return (
                        <>
                          {regulars.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2 font-medium">{t("create.playersStep.regular")} ({regulars.length})</p>
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
                                      photoUrl={player.photo_url}
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
                              <p className="text-xs text-muted-foreground mb-2 font-medium">{t("create.playersStep.occasional")} ({occasionals.length})</p>
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
                                      photoUrl={player.photo_url}
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
                        </>
                      );
                    })()}

                    {/* Guest Players */}
                    {guestPlayers.length > 0 && (
                      <div>
                        <p className="text-xs text-amber-700/50 mb-2 font-medium">{t("create.guest.guests")} ({guestPlayers.length})</p>
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
                              <PlayerAvatar
                                name={player.name}
                                photoUrl={null}
                                size="sm"
                              />
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

                  {/* Spacer for sticky bottom bar */}
                  <div className="h-20" />
                </>
              )}

              {/* Sticky bottom bar */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-30">
                <div className="max-w-2xl mx-auto flex gap-3">
                  <Button onClick={goBack} className="flex-1 bg-muted hover:bg-muted/80 text-foreground border-border">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("create.back")}
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={!canProceedToCaptains}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {t("create.continue")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Select Captains */}
          {step === "captains" && (
            <motion.div
              key="captains"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  <Crown className="inline h-6 w-6 mr-2 text-amber-400" />
                  {t("create.captainsStep.title", { total: numTeams })}
                </h1>
                <p className="text-muted-foreground">
                  {t("create.captainsStep.selected", { count: captainIds.length, total: numTeams })}
                </p>
              </div>

              {/* Selected Captains Display */}
              <div className="flex justify-center gap-4">
                {Array.from({ length: NUM_TEAMS }, (_, i) => i + 1).map((num) => {
                  const captain = captains[num - 1];
                  return (
                    <div
                      key={num}
                      className={`w-20 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center ${
                        captain
                          ? "border-primary bg-primary/15"
                          : "border-border"
                      }`}
                    >
                      {captain ? (
                        <>
                          <PlayerAvatar
                            name={captain.name}
                            photoUrl={captain.photo_url}
                            size="md"
                          />
                          <span className="text-xs mt-1 truncate w-full text-center px-1 text-foreground">
                            {captain.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {t("captain", { number: num })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Note about guests */}
              {guestPlayers.length > 0 && (
                <p className="text-center text-muted-foreground text-sm">
                  {t("create.captainsStep.guestsCannotBeCaptains")}
                </p>
              )}

              <div className="bg-card shadow-card rounded-xl p-4 border border-border">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedPlayers.map((player) => {
                    const isGuest = player.isGuest;
                    const isCaptain = captainIds.includes(player.id);
                    const isDisabled = isGuest || (captainIds.length >= NUM_TEAMS && !isCaptain);

                    return (
                      <button
                        key={player.id}
                        onClick={() => !isGuest && toggleCaptain(player.id)}
                        disabled={isDisabled}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isCaptain
                            ? "bg-amber-500/20 border-2 border-amber-400"
                            : isGuest
                            ? "bg-muted/50 border-2 border-transparent opacity-50 cursor-not-allowed"
                            : "bg-card border-2 border-border hover:bg-muted disabled:opacity-50"
                        }`}
                      >
                        <PlayerAvatar
                          name={player.name}
                          photoUrl={player.photo_url}
                          size="sm"
                        />
                        <span className={`text-sm font-medium truncate ${isGuest ? "text-muted-foreground" : "text-foreground"}`}>
                          {player.name}
                        </span>
                        {isCaptain && (
                          <Crown className="h-4 w-4 text-amber-400 ml-auto" />
                        )}
                        {isGuest && (
                          <span className="text-xs text-amber-500 ml-auto">{t("create.guest.guestLabel")}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spacer for sticky bottom bar */}
              <div className="h-20" />

              {/* Sticky bottom bar */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border z-30">
                <div className="max-w-2xl mx-auto flex gap-3">
                  <Button onClick={goBack} className="flex-1 bg-muted hover:bg-muted/80 text-foreground border-border">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("create.back")}
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={!canProceedToConfirm}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {t("create.continue")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Confirm */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {t("create.confirmStep.title")}
                </h1>
                <p className="text-muted-foreground">{t("create.confirmStep.reviewDetails")}</p>
              </div>

              <div className="bg-card shadow-card rounded-xl p-6 border border-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("create.confirmStep.draftName")}:</span>
                  <span className="font-semibold text-foreground">{draftName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("create.confirmStep.players")}:</span>
                  <span className="font-semibold text-foreground">
                    {selectedPlayerIds.length}
                    {guestPlayers.length > 0 && (
                      <span className="text-amber-400 text-sm ml-2">
                        ({guestPlayers.filter(g => selectedPlayerIds.includes(g.id)).length} {t("create.guest.guests").toLowerCase()})
                      </span>
                    )}
                  </span>
                </div>
                <div className="border-t border-border pt-4">
                  <span className="text-muted-foreground block mb-3">{t("create.confirmStep.captains")}:</span>
                  <div className="flex justify-center gap-4">
                    {captains.map((captain, idx) => (
                      <div key={captain.id} className="text-center">
                        <PlayerAvatar
                          name={captain.name}
                          photoUrl={captain.photo_url}
                          size="lg"
                        />
                        <p className="text-sm font-medium mt-2 text-foreground">{captain.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {t("captain", { number: idx + 1 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fairness warning */}
              {(() => {
                const nonCaptainCount = selectedPlayerIds.length - numTeams;
                if (numTeams === 2 && nonCaptainCount % 2 !== 0) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800 font-medium">
                          {t("create.fairness.unevenTeams2")}
                        </p>
                      </div>
                      <div className="space-y-2 ml-7">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="draftMode"
                            checked={draftMode === "all"}
                            onChange={() => setDraftMode("all")}
                            className="accent-amber-500"
                          />
                          <span className="text-sm text-amber-700">
                            {t("create.fairness.unevenOption", { playerCount: selectedPlayerIds.length })}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="draftMode"
                            checked={draftMode === "even"}
                            onChange={() => setDraftMode("even")}
                            className="accent-amber-500"
                          />
                          <span className="text-sm text-amber-700">
                            {t("create.fairness.evenOption", {
                              playerCount: selectedPlayerIds.length,
                              evenCount: selectedPlayerIds.length - 1,
                            })}
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                }
                if (numTeams === 3 && nonCaptainCount % 3 !== 0) {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-700">
                          {t("create.fairness.unevenTeams3", { teams: numTeams })}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex gap-3">
                <Button onClick={goBack} className="flex-1 bg-muted hover:bg-muted/80 text-foreground border-border">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("create.back")}
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {t("create.confirmStep.startDraft")}
                      <Check className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}
