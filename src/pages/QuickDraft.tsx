import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  generateRaffleOrder,
  generateSnakeDraftOrder,
  getTeamConfig,
} from "@/lib/draftUtils";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Users,
  Crown,
  Plus,
  X,
  Zap,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Player {
  id: string;
  name: string;
}

type Step = "name" | "players" | "captains" | "confirm";

export default function QuickDraft() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("draft");

  const [step, setStep] = useState<Step>("name");
  const [numTeams, setNumTeams] = useState(3);
  const [draftName, setDraftName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [captainIds, setCaptainIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [draftMode, setDraftMode] = useState<"all" | "even">("all");

  const addPlayer = () => {
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) return;

    // Check for duplicate
    if (players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({
        title: t("quick.duplicatePlayer"),
        description: t("quick.duplicatePlayerDescription"),
        variant: "destructive",
      });
      return;
    }

    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: trimmedName,
    };

    setPlayers((prev) => [...prev, newPlayer]);
    setNewPlayerName("");
  };

  const removePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setCaptainIds((prev) => prev.filter((id) => id !== playerId));
  };

  const toggleCaptain = (playerId: string) => {
    if (captainIds.includes(playerId)) {
      setCaptainIds((prev) => prev.filter((id) => id !== playerId));
    } else if (captainIds.length < NUM_TEAMS) {
      setCaptainIds((prev) => [...prev, playerId]);
    }
  };

  const captains = players.filter((p) => captainIds.includes(p.id));

  // Draft configuration based on team count
  const { minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS } = getTeamConfig(numTeams);
  const NUM_TEAMS = numTeams;

  const canProceedToPlayers = draftName.trim().length >= 2;
  const canProceedToCaptains = players.length >= MIN_PLAYERS && players.length <= MAX_PLAYERS;
  const canProceedToConfirm = captainIds.length === NUM_TEAMS;

  const handleCreate = async () => {
    setCreating(true);

    try {
      // When "even" mode is selected, drop the last non-captain player
      let effectivePlayers = [...players];
      if (draftMode === "even" && numTeams === 2) {
        const lastNonCaptainIndex = [...effectivePlayers]
          .reverse()
          .findIndex((p) => !captainIds.includes(p.id));
        if (lastNonCaptainIndex >= 0) {
          effectivePlayers.splice(
            effectivePlayers.length - 1 - lastNonCaptainIndex,
            1
          );
        }
      }

      const raffleOrder = generateRaffleOrder(numTeams);
      const totalPicks = effectivePlayers.length - NUM_TEAMS;
      const draftOrder = generateSnakeDraftOrder(totalPicks, raffleOrder);

      // Build players array with captain flags (captains first to preserve order)
      const captainPlayers = captainIds.map((cid) => {
        const p = effectivePlayers.find((pl) => pl.id === cid);
        return { name: p!.name, is_captain: true };
      });
      const nonCaptainPlayers = effectivePlayers
        .filter((p) => !captainIds.includes(p.id))
        .map((p) => ({ name: p.name, is_captain: false }));
      const allPlayers = [...captainPlayers, ...nonCaptainPlayers];

      // Use SECURITY DEFINER RPC to create draft (bypasses RLS for anonymous users)
      const { data: roomCode, error } = await supabase.rpc("create_quick_draft", {
        p_draft_name: draftName.trim(),
        p_players: allPlayers,
        p_raffle_order: raffleOrder,
        p_draft_order: draftOrder,
        p_num_teams: numTeams,
      });

      if (error) throw error;

      toast({
        title: t("quick.toast.created"),
        description: t("quick.toast.roomCode", { code: roomCode }),
      });

      navigate(`/room/${roomCode}`);
    } catch (err) {
      console.error("Error creating quick draft:", err);
      toast({
        title: t("quick.toast.error"),
        description: t("quick.toast.errorDescription"),
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-purple-900">
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-800 to-purple-950" />
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
        <header
          className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-sm"
        >
          <Link
            to="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("quick.back")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="text-lg font-bold text-white">{t("quick.title")}</span>
          </div>
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
                          ? "bg-amber-500 text-white"
                          : (
                              ["name", "players", "captains", "confirm"] as Step[]
                            ).indexOf(step) > i
                          ? "bg-amber-600 text-white"
                          : "bg-white/20 text-white/50"
                      }`}
                    >
                      {(
                        ["name", "players", "captains", "confirm"] as Step[]
                      ).indexOf(step) > i ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < 3 && (
                      <div
                        className={`w-8 h-1 mx-1 ${
                          (
                            ["name", "players", "captains", "confirm"] as Step[]
                          ).indexOf(step) > i
                            ? "bg-amber-600"
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
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full text-amber-300 text-sm mb-4">
                    <Zap className="h-4 w-4" />
                    {t("quick.subtitle")}
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {t("quick.title")}
                  </h1>
                  <p className="text-white/60">{t("quick.nameDraft")}</p>
                </div>

                {/* Team Count Selector */}
                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 space-y-3">
                  <Label className="text-white/80">{t("create.teamCount.title")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setNumTeams(n);
                          if (n < numTeams) setCaptainIds((prev) => prev.slice(0, n));
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          numTeams === n
                            ? "border-amber-400 bg-amber-500/20"
                            : "border-white/20 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-lg font-bold text-white">
                          {t(`create.teamCount.${n === 2 ? "two" : "three"}`)}
                        </span>
                        <p className="text-xs text-white/50 mt-1">
                          {t(`create.teamCount.${n === 2 ? "twoDescription" : "threeDescription"}`)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <div>
                    <Label htmlFor="draftName" className="text-white/80">
                      {t("quick.draftNameLabel")}
                    </Label>
                    <Input
                      id="draftName"
                      placeholder={t("quick.draftNamePlaceholder")}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="mt-2 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      maxLength={50}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  onClick={goNext}
                  disabled={!canProceedToPlayers}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  {t("quick.continue")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Add Players */}
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
                    <Users className="inline h-6 w-6 mr-2" />
                    {t("quick.addPlayersTitle")}
                  </h1>
                  <p className="text-white/60">
                    {t("quick.playersAdded", { count: players.length, min: MIN_PLAYERS, max: MAX_PLAYERS })}
                  </p>
                </div>

                {/* Add Player Form */}
                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("quick.playerPlaceholder")}
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                      className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                      maxLength={30}
                    />
                    <Button
                      onClick={addPlayer}
                      disabled={!newPlayerName.trim()}
                      className="h-12 px-4 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Players List */}
                {players.length > 0 && (
                  <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {players.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/10 border border-white/10"
                        >
                          <PlayerAvatar name={player.name} photoUrl={null} size="sm" />
                          <span className="text-sm text-white truncate flex-1">
                            {player.name}
                          </span>
                          <button
                            onClick={() => removePlayer(player.id)}
                            className="text-white/40 hover:text-red-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {players.length === 0 && (
                  <div className="text-center py-8 text-white/40">
                    {t("quick.minimumPlayers", { min: MIN_PLAYERS })}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={goBack}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("quick.back")}
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={!canProceedToCaptains}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {t("quick.continue")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
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
                  <h1 className="text-2xl font-bold text-white mb-2">
                    <Crown className="inline h-6 w-6 mr-2 text-amber-400" />
                    {t("quick.pickCaptains", { count: NUM_TEAMS })}
                  </h1>
                  <p className="text-white/60">
                    {t("quick.captainsSelected", { count: captainIds.length, total: NUM_TEAMS })}
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
                            ? "border-amber-400 bg-amber-500/20"
                            : "border-white/30"
                        }`}
                      >
                        {captain ? (
                          <>
                            <PlayerAvatar
                              name={captain.name}
                              photoUrl={null}
                              size="md"
                            />
                            <span className="text-xs mt-1 truncate w-full text-center px-1 text-white">
                              {captain.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-white/50 text-xs">
                            {t("captain", { number: num })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {players.map((player) => {
                      const isCaptain = captainIds.includes(player.id);
                      const isDisabled = captainIds.length >= NUM_TEAMS && !isCaptain;

                      return (
                        <button
                          key={player.id}
                          onClick={() => toggleCaptain(player.id)}
                          disabled={isDisabled}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            isCaptain
                              ? "bg-amber-500/20 border-2 border-amber-400"
                              : "bg-white/10 border-2 border-transparent hover:bg-white/20 disabled:opacity-50"
                          }`}
                        >
                          <PlayerAvatar
                            name={player.name}
                            photoUrl={null}
                            size="sm"
                          />
                          <span className="text-sm font-medium text-white truncate">
                            {player.name}
                          </span>
                          {isCaptain && (
                            <Crown className="h-4 w-4 text-amber-400 ml-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={goBack}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("quick.back")}
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={!canProceedToConfirm}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {t("quick.continue")}
                    <ArrowRight className="h-4 w-4 ml-2" />
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
                    {t("quick.confirmTitle")}
                  </h1>
                  <p className="text-white/60">{t("quick.confirmSubtitle")}</p>
                </div>

                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">{t("quick.draftNameLabel")}:</span>
                    <span className="font-semibold text-white">{draftName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">{t("quick.playerCount")}:</span>
                    <span className="font-semibold text-white">
                      {players.length}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <span className="text-white/60 block mb-3">{t("quick.captainsLabel")}:</span>
                    <div className="flex justify-center gap-4">
                      {captains.map((captain, idx) => (
                        <div key={captain.id} className="text-center">
                          <PlayerAvatar
                            name={captain.name}
                            photoUrl={null}
                            size="lg"
                          />
                          <p className="text-sm font-medium mt-2 text-white">
                            {captain.name}
                          </p>
                          <span className="text-xs text-white/60">
                            {t("captain", { number: idx + 1 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fairness warning */}
                {(() => {
                  const nonCaptainCount = players.length - numTeams;
                  if (numTeams === 2 && nonCaptainCount % 2 !== 0) {
                    return (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-sm text-amber-200 font-medium">
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
                              className="accent-amber-400"
                            />
                            <span className="text-sm text-amber-300/80">
                              {t("create.fairness.unevenOption", { playerCount: players.length })}
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="draftMode"
                              checked={draftMode === "even"}
                              onChange={() => setDraftMode("even")}
                              className="accent-amber-400"
                            />
                            <span className="text-sm text-amber-300/80">
                              {t("create.fairness.evenOption", {
                                playerCount: players.length,
                                evenCount: players.length - 1,
                              })}
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  }
                  if (numTeams === 3 && nonCaptainCount % 3 !== 0) {
                    return (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-2">
                          <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                          <p className="text-sm text-blue-300/80">
                            {t("create.fairness.unevenTeams3", { teams: numTeams })}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="flex gap-3">
                  <Button
                    onClick={goBack}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("quick.back")}
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {t("quick.startDraft")}
                        <Zap className="h-4 w-4 ml-2" />
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
