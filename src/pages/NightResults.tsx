import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCaptainColor, getCaptainLabel } from "@/lib/draftUtils";
import { getCaptainPlayerId, getAllCaptains } from "@/lib/captainHelpers";
import type { Json } from "@/integrations/supabase/types";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useClubContext } from "@/hooks/useClubContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Crown, Trophy, Users, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

// --- Types ---

interface NightSummary {
  night_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  club_name: string | null;
  draft_name: string | null;
  room_code: string;
  captain1_player_id: string | null;
  captain2_player_id: string | null;
  captain3_player_id: string | null;
  num_teams: number | null;
  captains: Json | null;
  total_games: number;
  total_goals: number;
  games: GameData[];
  standings: StandingData[];
  top_scorers: ScorerData[];
}

interface GameData {
  id: string;
  game_number: number;
  team_a_captain_number: number;
  team_b_captain_number: number;
  score_a: number;
  score_b: number;
  result: string | null;
  penalty_score_a: number | null;
  penalty_score_b: number | null;
  ended_at: string | null;
  goals?: Array<{ player_name: string; team_captain_number: number; minute: number | null }>;
}

interface StandingData {
  captain_number: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

interface ScorerData {
  player_id: string;
  player_name: string;
  player_photo: string | null;
  goals: number;
}

interface RoomPlayer {
  player_id: string | null;
  is_captain: boolean;
  display_name: string;
  photo_url: string | null;
}

// --- Component ---

export default function NightResults() {
  const { nightId } = useParams<{ nightId: string }>();
  const { isMember } = useClubContext();
  const { toast } = useToast();
  const { t } = useTranslation("gamenight");

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<NightSummary | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [showClaimSheet, setShowClaimSheet] = useState(false);
  const [claimSent, setClaimSent] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Build goal count map from top_scorers for badges in claim sheet
  const goalCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (summary?.top_scorers) {
      for (const s of summary.top_scorers) {
        if (s.player_id) map.set(s.player_id, s.goals);
      }
    }
    return map;
  }, [summary]);

  const getCaptainName = useCallback(
    (captainNum: number) => {
      if (!summary) return getCaptainLabel(captainNum);
      const captainPlayerId = getCaptainPlayerId(summary, captainNum);
      if (!captainPlayerId) return getCaptainLabel(captainNum);
      const player = players.find((p) => p.player_id === captainPlayerId);
      return player?.display_name || getCaptainLabel(captainNum);
    },
    [summary, players]
  );

  useEffect(() => {
    async function fetchData() {
      if (!nightId) return;

      try {
        const { data, error } = await supabase.rpc("get_game_night_public", {
          p_night_id: nightId,
        });

        if (error || !data) {
          setLoading(false);
          return;
        }

        const s = data as NightSummary;
        setSummary(s);

        if (s.room_code) {
          const { data: playersData } = await supabase.rpc("get_room_players_public", {
            p_room_code: s.room_code,
          });
          if (playersData) {
            setPlayers(playersData as RoomPlayer[]);
          }
        }
      } catch (err) {
        console.error("Error fetching night results:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [nightId]);

  const handleClaim = async (playerId: string) => {
    setClaimingId(playerId);
    try {
      const { data, error } = await supabase.rpc("request_player_invite", {
        p_player_id: playerId,
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
  };

  // Claimable players: have a player_id (linked to club pool)
  const claimablePlayers = useMemo(() => {
    return players.filter((p) => p.player_id);
  }, [players]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white text-lg font-bold mb-2">{t("nightResults.notFound")}</p>
          <p className="text-white/60 text-sm mb-4">{t("nightResults.invalidLink")}</p>
          <Link
            to="/"
            className="text-purple-400 hover:text-purple-300 underline text-sm"
          >
            {t("nightResults.backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  const completedGames = (summary.games || []).filter((g) => g.ended_at);

  // Sort claimable players: scorers first (by goal count desc), then others
  const sortedClaimable = [...claimablePlayers].sort((a, b) => {
    const aGoals = a.player_id ? (goalCountMap.get(a.player_id) || 0) : 0;
    const bGoals = b.player_id ? (goalCountMap.get(b.player_id) || 0) : 0;
    return bGoals - aGoals;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 relative overflow-hidden">
      {/* Pitch lines decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/10 rounded-full" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/10" />
        <div className="absolute top-1/4 left-0 right-0 h-px bg-white/5" />
        <div className="absolute top-3/4 left-0 right-0 h-px bg-white/5" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="px-4 py-4 flex flex-col items-center gap-1 bg-black/20 backdrop-blur-sm border-b border-white/10">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <h1 className="text-lg font-heading font-bold text-white">
            {summary.club_name || summary.draft_name || t("nightResults.title")}
          </h1>
          <p className="text-white/50 text-xs">
            {format(new Date(summary.started_at), "EEEE, MMMM d, yyyy")}
          </p>
        </header>

        <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
          {/* Stats Banner */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/10 text-center">
            <div className="flex justify-center gap-8">
              <div>
                <p className="text-3xl font-mono font-bold text-white">{summary.total_games}</p>
                <p className="text-white/50 text-xs">{t("summary.games")}</p>
              </div>
              <div>
                <p className="text-3xl font-mono font-bold text-white">{summary.total_goals}</p>
                <p className="text-white/50 text-xs">{t("summary.totalGoals")}</p>
              </div>
            </div>
          </div>

          {/* Game Results */}
          {completedGames.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">{t("summary.results")}</h3>
              {completedGames.map((g) => {
                const isAWin = g.result === "team_a_win";
                const isBWin = g.result === "team_b_win";
                return (
                  <div
                    key={g.id}
                    className="bg-black/20 rounded-xl p-3 border border-white/10 flex items-center"
                  >
                    <span className="text-white/40 text-xs w-8">#{g.game_number}</span>
                    <div className="flex-1 flex items-center justify-center gap-3">
                      <span className={`text-sm font-medium ${isAWin ? "text-purple-400" : "text-white/70"}`}>
                        {getCaptainName(g.team_a_captain_number)}
                      </span>
                      <span className="text-white font-mono font-bold text-base">
                        {g.score_a} - {g.score_b}
                      </span>
                      <span className={`text-sm font-medium ${isBWin ? "text-purple-400" : "text-white/70"}`}>
                        {getCaptainName(g.team_b_captain_number)}
                      </span>
                    </div>
                    {g.penalty_score_a != null && (
                      <span className="text-white/40 text-xs">{t("summary.penalties")}</span>
                    )}
                    {g.goals && g.goals.length > 0 && (
                      <div className="w-full mt-2 pt-2 border-t border-white/5">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {g.goals.map((goal, gi) => (
                            <span key={gi} className="text-white/40 text-xs">
                              {goal.player_name}{goal.minute ? ` ${goal.minute}'` : ""}
                              {gi < g.goals!.length - 1 ? "," : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Standings */}
          {(summary.standings?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-yellow-400" />
                {t("standings.title")}
              </h3>
              <div className="bg-black/20 rounded-xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-6 gap-1 px-3 py-2 text-white/40 text-xs border-b border-white/10">
                  <span className="col-span-2">#</span>
                  <span className="text-center">{t("standings.wins")}</span>
                  <span className="text-center">{t("standings.draws")}</span>
                  <span className="text-center">{t("standings.losses")}</span>
                  <span className="text-center font-bold">{t("standings.points")}</span>
                </div>
                {summary.standings!.map((s, i) => (
                  <div
                    key={s.captain_number}
                    className={`grid grid-cols-6 gap-1 px-3 py-2.5 ${i === 0 ? "bg-yellow-400/10" : ""}`}
                  >
                    <span className="col-span-2 text-white text-sm font-medium flex items-center gap-1.5">
                      {i === 0 && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                      {getCaptainName(s.captain_number)}
                    </span>
                    <span className="text-center text-purple-400 text-sm">{s.wins}</span>
                    <span className="text-center text-white/50 text-sm">{s.draws}</span>
                    <span className="text-center text-red-400/70 text-sm">{s.losses}</span>
                    <span className="text-center text-white font-bold text-sm">{s.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Scorers */}
          {(summary.top_scorers?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h3 className="text-white/70 text-sm font-medium">{t("nightResults.topScorers")}</h3>
              <div className="space-y-2">
                {summary.top_scorers!.slice(0, 3).map((scorer, i) => (
                  <div
                    key={scorer.player_id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      i === 0
                        ? "bg-yellow-400/10 border-yellow-400/30"
                        : "bg-black/20 border-white/10"
                    }`}
                  >
                    <span className={`text-lg font-bold ${i === 0 ? "text-yellow-400" : "text-white/40"}`}>
                      {i + 1}
                    </span>
                    <PlayerAvatar
                      name={scorer.player_name}
                      photoUrl={scorer.player_photo}
                      size="sm"
                    />
                    <span className="flex-1 text-white font-medium text-sm">{scorer.player_name}</span>
                    <span className={`font-bold ${i === 0 ? "text-yellow-400" : "text-white/60"}`}>
                      {scorer.goals}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claim CTA — "This is me" */}
          {claimablePlayers.length > 0 && !isMember && (
            <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-4 border border-purple-400/30">
              {claimSent ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-purple-400 font-bold text-sm">
                      {t("requestSent.title")}
                    </p>
                    <p className="text-white/60 text-xs mt-0.5">
                      {t("requestSent.subtitle")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-purple-300" />
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
                      className="mt-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {t("visitor.claimButton")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Already a member */}
          {isMember && (
            <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-4 border border-purple-400/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-purple-400 font-bold text-sm">
                    {t("member.title")}
                  </p>
                  <p className="text-white/60 text-xs mt-0.5">
                    {t("member.subtitle")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Growth CTA */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <p className="text-white font-bold text-sm mb-1">
              {t("growth.title")}
            </p>
            <p className="text-white/60 text-xs mb-3">
              {t("growth.subtitle")}
            </p>
            <Link
              to="/auth"
              className="inline-block px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium text-sm rounded-lg transition-colors"
            >
              {t("growth.cta")}
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center pb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/50 transition-colors text-xs"
            >
              <img src="/favicon.ico" alt="" className="w-3.5 h-3.5 opacity-40" />
              {t("footer.brand")}
            </Link>
          </div>
        </div>
      </div>

      {/* Claim Bottom Sheet */}
      {showClaimSheet && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-40"
            onClick={() => setShowClaimSheet(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-purple-900 border-t border-white/10 rounded-t-2xl max-h-[70vh] flex flex-col"
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-heading font-bold text-white">{t("claim.sheetTitle")}</h3>
              <button
                onClick={() => setShowClaimSheet(false)}
                className="p-2 text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Player list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-white/40 text-xs mb-1">{t("nightResults.nightPlayers")}</p>
              {sortedClaimable.map((player) => {
                const goals = player.player_id ? goalCountMap.get(player.player_id) : undefined;
                const captainPlayerIds = getAllCaptains(summary).map(c => c.playerId).filter(Boolean);
                const isCaptain = captainPlayerIds.includes(player.player_id);

                return (
                  <button
                    key={player.player_id}
                    disabled={claimingId !== null}
                    onClick={() => player.player_id && handleClaim(player.player_id)}
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
                    {isCaptain && (
                      <Crown className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                    )}
                    {goals && goals > 0 && (
                      <span className="text-xs text-purple-400 flex-shrink-0">
                        ⚽{goals}
                      </span>
                    )}
                    {claimingId === player.player_id && (
                      <Loader2 className="h-4 w-4 animate-spin text-white/60 flex-shrink-0" />
                    )}
                  </button>
                );
              })}

              {sortedClaimable.length === 0 && (
                <p className="text-center text-white/50 text-sm py-4">
                  {t("claim.noPlayers")}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
