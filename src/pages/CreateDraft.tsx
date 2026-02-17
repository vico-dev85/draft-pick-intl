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
import { generateRoomCode, generateRaffleOrder, generateSnakeDraftOrder } from "@/lib/draftUtils";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Users,
  Crown,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText,
  UserPlus,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

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

  const [step, setStep] = useState<Step>("name");
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
        if (remakeState.draftName) setDraftName(remakeState.draftName + " (חוזר)");
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
        title: "שחקן קיים",
        description: "כבר יש שחקן עם שם זה",
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

  // Draft configuration - ready for future 2-team mode
  const NUM_TEAMS = 3; // TODO: make configurable (2 or 3)
  const MIN_PLAYERS = 12; // For 3 teams: 12-15 total (including 3 captains)
  const MAX_PLAYERS = 15; // For 2 teams: might be 8-12 total (including 2 captains)

  const canProceedToPlayers = draftName.trim().length >= 2;
  const canProceedToCaptains = selectedPlayerIds.length >= MIN_PLAYERS && selectedPlayerIds.length <= MAX_PLAYERS;
  const canProceedToConfirm = captainIds.length === NUM_TEAMS;

  const handleCreate = async () => {
    if (!user) return;

    setCreating(true);

    try {
      const roomCode = generateRoomCode();

      // Pre-generate raffle order and snake draft order BEFORE any captains connect
      // This ensures all clients read the same predetermined order from the database
      const raffleOrder = generateRaffleOrder();
      const totalPicks = selectedPlayerIds.length - NUM_TEAMS; // Non-captain players
      const draftOrder = generateSnakeDraftOrder(totalPicks, raffleOrder);

      // Create draft room with pre-generated draft order and raffle order
      const { data: room, error: roomError } = await supabase
        .from("draft_rooms")
        .insert({
          creator_user_id: user.id,
          draft_name: draftName.trim(),
          room_code: roomCode,
          captain1_player_id: captainIds[0],
          captain2_player_id: captainIds[1],
          captain3_player_id: captainIds[2],
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
      const draftPlayers = selectedPlayerIds.map((playerId) => {
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
        title: "הכוחות נוצרו!",
        description: `קוד החדר: ${roomCode}`,
      });

      navigate(`/room/${roomCode}`);
    } catch (err) {
      console.error("Error creating draft:", err);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור את הדראפט",
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
      <div className="min-h-screen bg-emerald-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

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
        {/* Header */}
        <header className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-sm" dir="rtl">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>חזרה</span>
          </Link>
          <img src="/logo.png" alt="kohot.online" className="h-8 w-auto" />
        </header>

      <main className="px-4 py-8 max-w-2xl mx-auto" dir="rtl">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {(["name", "players", "captains", "confirm"] as Step[]).map(
              (s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s
                        ? "bg-emerald-500 text-white"
                        : (["name", "players", "captains", "confirm"] as Step[]).indexOf(
                            step
                          ) > i
                        ? "bg-emerald-600 text-white"
                        : "bg-white/20 text-white/50"
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
                          ? "bg-emerald-600"
                          : "bg-white/20"
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
                <h1 className="text-2xl font-bold text-white mb-2">
                  צור כוחות חדשים
                </h1>
                <p className="text-white/60">תן שם ופרטים</p>
              </div>

              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 space-y-4">
                <div>
                  <Label htmlFor="draftName" className="text-white/80">שם הכוחות</Label>
                  <Input
                    id="draftName"
                    placeholder="לדוגמה: כוחות יום שישי"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="mt-2 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    maxLength={50}
                  />
                </div>

                {/* Collapsible Details */}
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between text-white/60 hover:text-white/80 transition-colors py-2"
                >
                  <span className="text-sm">הוסף פרטים נוספים</span>
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
                    className="space-y-4 pt-2 border-t border-white/10"
                  >
                    <div>
                      <Label htmlFor="location" className="text-white/80 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        מיקום
                      </Label>
                      <Input
                        id="location"
                        placeholder="לדוגמה: מגרש הכדורגל ליד הקניון"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="mt-2 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes" className="text-white/80 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        הערות
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="לדוגמה: להביא חולצות שחורות וצהובות"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                        rows={2}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              <Button
                onClick={goNext}
                disabled={!canProceedToPlayers}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                המשך
                <ArrowLeft className="h-4 w-4 mr-2" />
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
                <h1 className="text-2xl font-bold text-white mb-2">
                  <Users className="inline h-6 w-6 ml-2" />
                  בחר שחקנים
                </h1>
                <p className="text-white/60">
                  בחרת {selectedPlayerIds.length} שחקנים (נדרש {MIN_PLAYERS}-{MAX_PLAYERS})
                </p>
              </div>

              {fetchError === "member_access_denied" ? (
                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-2">
                    אין גישה לרשימת השחקנים
                  </h3>
                  <p className="text-white/60 mb-4">
                    ייתכן שהקישור לקבוצה פג תוקף או שההצטרפות לא הושלמה. בקש מהמנהל לשלוח הזמנה חדשה.
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                      onClick={() => { setLoading(true); fetchPlayers(); }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      נסה שוב
                    </Button>
                    <Button asChild className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                      <Link to="/dashboard">חזרה לדשבורד</Link>
                    </Button>
                  </div>
                </div>
              ) : allPlayers.length === 0 && guestPlayers.length === 0 ? (
                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-2">
                    אין לך שחקנים עדיין
                  </h3>
                  <p className="text-white/60 mb-4">
                    הוסף שחקנים לספרייה או הוסף אורחים לכוחות הזה
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button asChild className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                      <Link to="/players">הוסף לספרייה</Link>
                    </Button>
                    <Button
                      onClick={() => setShowAddGuest(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <UserPlus className="h-4 w-4 ml-2" />
                      הוסף אורחים
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
                          placeholder="שם האורח"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addGuest()}
                          className="flex-1 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
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
                      <p className="text-white/60 text-sm">אורחים שנוספו: {guestPlayers.length}</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {guestPlayers.map((guest) => (
                          <span
                            key={guest.id}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 rounded-full text-amber-300 text-sm"
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
                    <Button size="sm" onClick={selectRegulars} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30">
                      בחר קבועים
                    </Button>
                    <Button size="sm" onClick={selectAll} className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                      בחר הכל
                    </Button>
                    <Button size="sm" onClick={deselectAll} className="bg-white/20 hover:bg-white/30 text-white border-white/20">
                      נקה בחירה
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddGuest(true)}
                      className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30"
                    >
                      <UserPlus className="h-4 w-4 ml-1" />
                      הוסף אורח
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
                          placeholder="שם האורח"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addGuest()}
                          className="flex-1 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
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
                          className="bg-white/20 hover:bg-white/30 text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-amber-300/70 mt-2">
                        אורחים הם שחקנים חד-פעמיים לכוחות הזה בלבד
                      </p>
                    </motion.div>
                  )}

                  <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-h-96 overflow-y-auto space-y-4">
                    {/* Regular Players */}
                    {(() => {
                      const regulars = allPlayers.filter((p) => p.category === 'regular' || !p.category);
                      const occasionals = allPlayers.filter((p) => p.category === 'occasional');
                      return (
                        <>
                          {regulars.length > 0 && (
                            <div>
                              <p className="text-xs text-white/50 mb-2 font-medium">קבועים ({regulars.length})</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {regulars.map((player) => (
                                  <label
                                    key={player.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                      selectedPlayerIds.includes(player.id)
                                        ? "bg-emerald-500/20 border-2 border-emerald-400"
                                        : "bg-white/10 border-2 border-transparent hover:bg-white/20"
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
                                    <span className="text-sm font-medium text-white truncate">
                                      {player.name}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {occasionals.length > 0 && (
                            <div>
                              <p className="text-xs text-white/50 mb-2 font-medium">מזדמנים ({occasionals.length})</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {occasionals.map((player) => (
                                  <label
                                    key={player.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                      selectedPlayerIds.includes(player.id)
                                        ? "bg-emerald-500/20 border-2 border-emerald-400"
                                        : "bg-white/10 border-2 border-transparent hover:bg-white/20"
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
                                    <span className="text-sm font-medium text-white truncate">
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
                        <p className="text-xs text-amber-300/50 mb-2 font-medium">אורחים ({guestPlayers.length})</p>
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
                              <span className="text-sm font-medium text-amber-300 truncate flex-1">
                                {player.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeGuest(player.id)}
                                className="text-amber-400/60 hover:text-amber-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={goBack} className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20">
                      <ArrowRight className="h-4 w-4 ml-2" />
                      חזרה
                    </Button>
                    <Button
                      onClick={goNext}
                      disabled={!canProceedToCaptains}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      המשך
                      <ArrowLeft className="h-4 w-4 mr-2" />
                    </Button>
                  </div>
                </>
              )}
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
                <h1 className="text-2xl font-bold text-white mb-2">
                  <Crown className="inline h-6 w-6 ml-2 text-amber-400" />
                  בחר {NUM_TEAMS} קפטנים
                </h1>
                <p className="text-white/60">
                  בחרת {captainIds.length}/{NUM_TEAMS} קפטנים
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
                          ? "border-emerald-400 bg-emerald-500/20"
                          : "border-white/30"
                      }`}
                    >
                      {captain ? (
                        <>
                          <PlayerAvatar
                            name={captain.name}
                            photoUrl={captain.photo_url}
                            size="md"
                          />
                          <span className="text-xs mt-1 truncate w-full text-center px-1 text-white">
                            {captain.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-white/50 text-xs">
                          קפטן {num}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Note about guests */}
              {guestPlayers.length > 0 && (
                <p className="text-center text-white/50 text-sm">
                  אורחים לא יכולים להיות קפטנים
                </p>
              )}

              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-h-72 overflow-y-auto">
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
                            ? "bg-white/5 border-2 border-transparent opacity-50 cursor-not-allowed"
                            : "bg-white/10 border-2 border-transparent hover:bg-white/20 disabled:opacity-50"
                        }`}
                      >
                        <PlayerAvatar
                          name={player.name}
                          photoUrl={player.photo_url}
                          size="sm"
                        />
                        <span className={`text-sm font-medium truncate ${isGuest ? "text-white/50" : "text-white"}`}>
                          {player.name}
                        </span>
                        {isCaptain && (
                          <Crown className="h-4 w-4 text-amber-400 ml-auto" />
                        )}
                        {isGuest && (
                          <span className="text-xs text-amber-400/50 ml-auto">אורח</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={goBack} className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20">
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזרה
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canProceedToConfirm}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  המשך
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
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
                <h1 className="text-2xl font-bold text-white mb-2">
                  אישור הכוחות
                </h1>
                <p className="text-white/60">בדוק את הפרטים לפני היצירה</p>
              </div>

              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">שם הכוחות:</span>
                  <span className="font-semibold text-white">{draftName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">מספר שחקנים:</span>
                  <span className="font-semibold text-white">
                    {selectedPlayerIds.length}
                    {guestPlayers.length > 0 && (
                      <span className="text-amber-400 text-sm mr-2">
                        ({guestPlayers.filter(g => selectedPlayerIds.includes(g.id)).length} אורחים)
                      </span>
                    )}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <span className="text-white/60 block mb-3">קפטנים:</span>
                  <div className="flex justify-center gap-4">
                    {captains.map((captain, idx) => (
                      <div key={captain.id} className="text-center">
                        <PlayerAvatar
                          name={captain.name}
                          photoUrl={captain.photo_url}
                          size="lg"
                        />
                        <p className="text-sm font-medium mt-2 text-white">{captain.name}</p>
                        <span className="text-xs text-white/60">
                          קפטן {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={goBack} className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20">
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזרה
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      צור כוחות
                      <Check className="h-4 w-4 mr-2" />
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
