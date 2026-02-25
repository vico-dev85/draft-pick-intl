import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useWakeLock } from "@/hooks/useWakeLock";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGameTimer } from "@/hooks/useGameTimer";
import { useAnnouncementQueue } from "@/hooks/useAnnouncementQueue";
import { getCaptainColor, getCaptainLabel, getTeamGridClass } from "@/lib/draftUtils";
import { getCaptainPlayerId, getNumTeams } from "@/lib/captainHelpers";
import { toggleMute, isMuted } from "@/lib/sounds";
import {
  Loader2,
  Crown,
  Trophy,
  Home,
  MessageCircle,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Undo2,
  Timer,
  X,
} from "lucide-react";
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
  location: string | null;
  notes: string | null;
  room_code: string;
  captain1_player_id: string | null;
  captain2_player_id: string | null;
  captain3_player_id: string | null;
  num_teams: number | null;
  captains: unknown[] | null;
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
  resting_captain_number: number | null;
  score_a: number;
  score_b: number;
  result: string | null;
  period: string;
  penalty_score_a: number | null;
  penalty_score_b: number | null;
  timer_start_at: string | null;
  timer_paused_at: string | null;
  timer_elapsed_before_pause: number;
  started_at: string | null;
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
  id: string;
  player_id: string | null;
  is_captain: boolean;
  picked_by_captain_number: number | null;
  display_name: string;
  photo_url: string | null;
}

interface TeamInfo {
  captainNumber: number;
  captainName: string;
  captainPhoto: string | null;
  players: RoomPlayer[]; // non-captain team members
}

type View = "pre_game" | "active_game" | "goal_picker" | "game_over" | "penalties" | "summary";

// --- Rotation logic ---
// Default rotation for first game or fallback (3-team)
const DEFAULT_MATCHUPS_3 = [
  { teamA: 1, teamB: 2, resting: 3 },
  { teamA: 1, teamB: 3, resting: 2 },
  { teamA: 2, teamB: 3, resting: 1 },
];

function getNextMatchup(games: GameData[], numTeams: number): { teamA: number; teamB: number; resting: number | null } {
  // 2-team mode: always same two teams, no resting
  if (numTeams === 2) {
    return { teamA: 1, teamB: 2, resting: null };
  }

  const completed = games.filter((g) => g.ended_at && g.result);
  if (completed.length === 0) {
    return DEFAULT_MATCHUPS_3[0];
  }

  const lastGame = completed[completed.length - 1];
  const resting = lastGame.resting_captain_number ?? 3;

  // Determine winner — winner stays, loser gets replaced by resting team
  if (lastGame.result === "team_a_win") {
    return { teamA: lastGame.team_a_captain_number, teamB: resting, resting: lastGame.team_b_captain_number };
  } else if (lastGame.result === "team_b_win") {
    return { teamA: lastGame.team_b_captain_number, teamB: resting, resting: lastGame.team_a_captain_number };
  } else {
    return DEFAULT_MATCHUPS_3[completed.length % 3];
  }
}

// --- Component ---

export default function GameNight() {
  const { nightId } = useParams<{ nightId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation("gamenight");
  useWakeLock(true);
  // Loading & data
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<NightSummary | null>(null);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [allPlayers, setAllPlayers] = useState<RoomPlayer[]>([]);

  // Game state
  const [view, setView] = useState<View>("pre_game");
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [activeGameNumber, setActiveGameNumber] = useState(0);
  const [teamA, setTeamA] = useState(1);
  const [teamB, setTeamB] = useState(2);
  const [resting, setResting] = useState<number | null>(3);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [goalPickerTeam, setGoalPickerTeam] = useState<number | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const [goalDebounce, setGoalDebounce] = useState(false);
  const [endingNight, setEndingNight] = useState(false);
  const [confirmEndGame, setConfirmEndGame] = useState(false);
  const [confirmEndNight, setConfirmEndNight] = useState(false);

  // Goal timeline for current game
  const [goals, setGoals] = useState<Array<{ id: string; player_name: string; team: number; minute: number }>>([]);

  // Announcements
  const { enqueue, clear: clearAnnouncements } = useAnnouncementQueue();

  // Team name helper
  const getTeamName = useCallback(
    (captainNumber: number) => {
      const team = teams.find((t) => t.captainNumber === captainNumber);
      return team?.captainName || getCaptainLabel(captainNumber);
    },
    [teams]
  );

  // Timer
  const timer = useGameTimer({
    onTwoMinWarning: () => {
      enqueue({ priority: 3, ttsText: t("tts.twoMinWarning") });
    },
    onOneMinWarning: () => {
      enqueue({ priority: 3, ttsText: t("tts.oneMinWarning") });
    },
    onLastAttack: () => {
      enqueue({ priority: 3, ttsText: t("tts.lastAttack") });
    },
    onTimeUp: (period) => {
      if (period === "regular") {
        // Check if tied
        if (scoreA === scoreB) {
          enqueue({ priority: 4, sound: "whistle.mp3", ttsText: t("tts.drawExtraTime"), ttsDelay: 800 });
          setTimeout(() => {
            timer.startExtraTime();
            if (activeGameId) {
              syncTimerToDb(activeGameId, {
                timer_start_at: new Date().toISOString(),
                timer_paused_at: null,
                timer_elapsed_before_pause: 0,
                period: "extra_time",
              });
            }
          }, 2000);
        } else {
          handleGameEnd();
        }
      } else {
        // Extra time ended
        if (scoreA === scoreB) {
          enqueue({ priority: 5, ttsText: t("tts.penalties") });
          timer.goToPenalties();
          setView("penalties");
        } else {
          handleGameEnd();
        }
      }
    },
  });

  // Score refs for timer callback closure
  const scoreARef = useRef(scoreA);
  const scoreBRef = useRef(scoreB);
  useEffect(() => { scoreARef.current = scoreA; }, [scoreA]);
  useEffect(() => { scoreBRef.current = scoreB; }, [scoreB]);

  // --- Data loading ---

  const fetchData = useCallback(async () => {
    if (!nightId) return;

    try {
      const { data, error } = await supabase.rpc("get_game_night_summary", {
        p_night_id: nightId,
      });

      if (error || !data) {
        navigate("/dashboard");
        return;
      }

      const s = data as NightSummary;
      setSummary(s);

      if (s.status === "ended") {
        setView("summary");
      }

      // Fetch players for team info
      if (s.room_code) {
        const { data: playersData } = await supabase.rpc("get_room_players_public", {
          p_room_code: s.room_code,
        });

        if (playersData) {
          const ps = playersData as RoomPlayer[];
          setAllPlayers(ps);

          // Build teams dynamically based on num_teams
          const nTeams = getNumTeams(s);
          const builtTeams: TeamInfo[] = Array.from({ length: nTeams }, (_, i) => {
            const num = i + 1;
            const captainPlayerId = getCaptainPlayerId(s, num);
            const captainPlayer = ps.find((p) => p.player_id === captainPlayerId);
            const teamPlayers = ps.filter(
              (p) => p.picked_by_captain_number === num && !p.is_captain
            );
            return {
              captainNumber: num,
              captainName: captainPlayer?.display_name || getCaptainLabel(num),
              captainPhoto: captainPlayer?.photo_url || null,
              players: teamPlayers,
            };
          });
          setTeams(builtTeams);

          // Check for in-progress game (started but not ended)
          const activeGame = (s.games || []).find((g) => g.started_at && !g.ended_at);
          if (activeGame) {
            setActiveGameId(activeGame.id);
            setActiveGameNumber(activeGame.game_number);
            setScoreA(activeGame.score_a);
            setScoreB(activeGame.score_b);
            setTeamA(activeGame.team_a_captain_number);
            setTeamB(activeGame.team_b_captain_number);
            setResting(activeGame.resting_captain_number ?? null);

            // Recover timer from DB
            if (activeGame.timer_start_at && !activeGame.timer_paused_at) {
              // Timer was running — calculate elapsed since last start
              const sinceStart = Date.now() - new Date(activeGame.timer_start_at).getTime();
              const totalElapsed = (activeGame.timer_elapsed_before_pause || 0) + sinceStart;
              const period = (activeGame.period === "extra_time" ? "extra_time" : "regular") as "regular" | "extra_time";
              timer.resumeFrom(totalElapsed, period, false);
            } else if (activeGame.timer_paused_at) {
              // Timer was paused
              const period = (activeGame.period === "extra_time" ? "extra_time" : "regular") as "regular" | "extra_time";
              timer.resumeFrom(activeGame.timer_elapsed_before_pause || 0, period, true);
            }
            // If no timer_start_at, timer shows PRE_GAME (user will press play)

            setView("active_game");
          } else {
            // Auto-suggest next matchup (winner stays for 3-team, rematch for 2-team)
            const next = getNextMatchup(s.games || [], nTeams);
            setTeamA(next.teamA);
            setTeamB(next.teamB);
            setResting(next.resting);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching game night:", err);
    } finally {
      setLoading(false);
    }
  }, [nightId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Timer DB sync ---

  const syncTimerToDb = useCallback(
    async (gameId: string, updates: Record<string, unknown>) => {
      try {
        await supabase.from("games").update(updates).eq("id", gameId);
      } catch {
        // Non-critical — timer recovery is best-effort
      }
    },
    []
  );

  // --- Game actions ---

  const handleStartGame = async () => {
    if (!nightId) return;

    try {
      const { data, error } = await supabase.rpc("start_game", {
        p_night_id: nightId,
        p_team_a: teamA,
        p_team_b: teamB,
        ...(resting !== null ? { p_resting: resting } : {}),
      });

      if (error) throw error;
      const result = data as { id: string; game_number: number };
      setActiveGameId(result.id);
      setActiveGameNumber(result.game_number);
      setScoreA(0);
      setScoreB(0);
      setGoals([]);
      setView("active_game");

      // Start timer + announce
      timer.start();
      syncTimerToDb(result.id, {
        timer_start_at: new Date().toISOString(),
        timer_paused_at: null,
        timer_elapsed_before_pause: 0,
      });
      enqueue({ priority: 2, sound: "whistle.mp3", ttsText: t("tts.kickoff") });
    } catch (err) {
      console.error("Error starting game:", err);
      toast({ title: t("end.errorTitle"), description: t("tts.errorStartGame"), variant: "destructive" });
    }
  };

  const handleGoalTap = (teamCaptainNumber: number) => {
    if (goalDebounce) return;
    setGoalPickerTeam(teamCaptainNumber);
    setView("goal_picker");
  };

  const handleScorerSelected = async (player: RoomPlayer | null) => {
    if (!activeGameId || goalPickerTeam === null) return;

    setGoalDebounce(true);
    setTimeout(() => setGoalDebounce(false), 1000);

    const newScoreA = goalPickerTeam === teamA ? scoreA + 1 : scoreA;
    const newScoreB = goalPickerTeam === teamB ? scoreB + 1 : scoreB;

    // Optimistic update
    setScoreA(newScoreA);
    setScoreB(newScoreB);
    scoreARef.current = newScoreA;
    scoreBRef.current = newScoreB;

    const scorerName = player?.display_name || t("goals.player");
    setGoals((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        player_name: scorerName,
        team: goalPickerTeam,
        minute: timer.currentMinute,
      },
    ]);

    setGoalPickerTeam(null);
    setView("active_game");

    // Announce
    const scoreText = `${newScoreA}-${newScoreB}`;
    enqueue({
      priority: 1,
      sound: "whistle.mp3",
      ttsText: t("tts.goalScored", { player: scorerName, score: scoreText }),
      ttsDelay: 600,
    });

    // Save to DB
    try {
      await supabase.rpc("record_goal", {
        p_game_id: activeGameId,
        p_player_id: player?.player_id || null,
        p_team_captain_number: goalPickerTeam,
        p_minute: timer.currentMinute,
        p_period: timer.currentPeriod,
      });
    } catch (err) {
      console.error("Error recording goal:", err);
    }

    // Check goal limit
    const maxScore = Math.max(newScoreA, newScoreB);
    if (maxScore >= timer.goalLimit) {
      timer.goalScored();
      setTimeout(() => handleGameEnd(), 1500);
    }
  };

  const handleUndoGoal = async () => {
    if (!activeGameId || goals.length === 0) return;

    const lastGoal = goals[goals.length - 1];
    setGoals((prev) => prev.slice(0, -1));

    if (lastGoal.team === teamA) {
      setScoreA((s) => Math.max(0, s - 1));
    } else {
      setScoreB((s) => Math.max(0, s - 1));
    }

    try {
      await supabase.rpc("undo_last_goal", { p_game_id: activeGameId });
    } catch (err) {
      console.error("Error undoing goal:", err);
    }

    toast({ title: t("goals.undone") });
  };

  const handleGameEnd = async () => {
    if (!activeGameId) return;

    const result =
      scoreARef.current > scoreBRef.current
        ? "team_a_win"
        : scoreBRef.current > scoreARef.current
        ? "team_b_win"
        : "draw";

    const winnerName =
      result === "team_a_win"
        ? getTeamName(teamA)
        : result === "team_b_win"
        ? getTeamName(teamB)
        : null;

    timer.endGame();

    enqueue({
      priority: 2,
      sound: "whistle.mp3",
      ttsText: winnerName
        ? t("tts.gameEndWin", { score: `${scoreARef.current}-${scoreBRef.current}`, winner: winnerName })
        : t("tts.gameEndDraw", { score: `${scoreARef.current}-${scoreBRef.current}` }),
      ttsDelay: 800,
    });

    try {
      await supabase.rpc("end_game", {
        p_game_id: activeGameId,
        p_result: result,
      });
    } catch (err) {
      console.error("Error ending game:", err);
    }

    setView("game_over");
  };

  const handlePenaltyWin = async (winner: "team_a_win" | "team_b_win") => {
    if (!activeGameId) return;

    try {
      await supabase.rpc("end_game", {
        p_game_id: activeGameId,
        p_result: winner,
        p_penalty_score_a: winner === "team_a_win" ? 1 : 0,
        p_penalty_score_b: winner === "team_b_win" ? 1 : 0,
      });
    } catch (err) {
      console.error("Error recording penalty result:", err);
    }

    timer.endGame();
    enqueue({ priority: 2, sound: "whistle.mp3" });
    setView("game_over");
  };

  const handleNextGame = async () => {
    // Refresh summary
    await fetchData();
    timer.reset();
    setView("pre_game");
  };

  const handleEndNight = async () => {
    if (!nightId) return;
    setEndingNight(true);

    try {
      await supabase.rpc("end_game_night", { p_night_id: nightId });
      await fetchData();
      setView("summary");
    } catch (err) {
      console.error("Error ending night:", err);
      toast({ title: t("end.errorTitle"), variant: "destructive" });
    } finally {
      setEndingNight(false);
    }
  };

  const handleToggleMute = () => {
    const newMuted = toggleMute();
    setMutedState(newMuted);
  };

  // --- WhatsApp share ---

  const generateShareText = useCallback(() => {
    if (!summary) return "";

    const date = format(new Date(summary.started_at), "MMMM d, yyyy");
    let text = `⚽ ${t("shareText.nightSummary", { club: summary.club_name || "", date })}\n\n`;
    text += `🏟️ ${t("shareText.gamesAndGoals", { games: summary.total_games, goals: summary.total_goals })}\n\n`;

    for (const game of summary.games || []) {
      if (!game.ended_at) continue;
      const aName = getTeamName(game.team_a_captain_number);
      const bName = getTeamName(game.team_b_captain_number);
      text += t("shareText.gameResult", {
        number: game.game_number,
        teamA: aName,
        scoreA: game.score_a,
        scoreB: game.score_b,
        teamB: bName,
      });
      if (game.penalty_score_a != null) {
        text += ` ${t("shareText.penaltyResult", { scoreA: game.penalty_score_a, scoreB: game.penalty_score_b })}`;
      }
      if (game.goals && game.goals.length > 0) {
        const goalNames = game.goals.map((g) => g.player_name + (g.minute ? ` ${g.minute}'` : "")).join(", ");
        text += `\n   ⚽ ${goalNames}`;
      }
      text += "\n";
    }

    if (summary.standings?.length) {
      text += `\n🏆 ${t("shareText.standingsTitle")}\n`;
      summary.standings.forEach((s, i) => {
        const name = getTeamName(s.captain_number);
        text += t("shareText.standingRow", {
          rank: i + 1,
          name,
          wins: s.wins,
          draws: s.draws,
          losses: s.losses,
          points: s.points,
        }) + "\n";
      });
    }

    if (summary.top_scorers?.length) {
      text += `\n⚽ ${t("shareText.topScorer", { name: summary.top_scorers[0].player_name, goals: summary.top_scorers[0].goals })}\n`;
      if (summary.top_scorers.length > 1) {
        const rest = summary.top_scorers
          .slice(1, 3)
          .map((s) => `${s.player_name} (${s.goals})`)
          .join(", ");
        text += `🥈 ${rest}\n`;
      }
    }

    const baseUrl = window.location.origin;
    text += `\n📊 ${baseUrl}/#/night-results/${nightId}\n`;
    text += `\n⚡ ${t("shareText.fairTeams")}`;

    return text;
  }, [summary, nightId, getTeamName, t]);

  const shareViaWhatsApp = () => {
    const text = generateShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // --- Loading ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!summary) return null;

  // --- Get team players for goal picker ---
  const getTeamPlayers = (captainNumber: number): RoomPlayer[] => {
    const team = teams.find((t) => t.captainNumber === captainNumber);
    if (!team) return [];
    // Include captain + team members
    const captainPlayerId = getCaptainPlayerId(summary, captainNumber);
    const captain = allPlayers.find(
      (p) => p.is_captain && p.player_id === captainPlayerId
    );
    return captain ? [captain, ...team.players] : [...team.players];
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/10 rounded-full" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/10" />
      </div>

      <div className="relative z-10">
        {/* ====== PRE-GAME VIEW ====== */}
        {view === "pre_game" && (
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-between bg-black/20 backdrop-blur-sm border-b border-white/10">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-purple-400" />
                <h1 className="text-lg font-bold text-white">{t("title")}</h1>
              </div>
              <Button variant="ghost" size="icon" className="text-white/60" onClick={handleToggleMute}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </header>

            {/* Completed games strip */}
            {(summary.games || []).filter((g) => g.ended_at).length > 0 && (
              <div className="px-4 py-3 flex gap-2 overflow-x-auto">
                {(summary.games || [])
                  .filter((g) => g.ended_at)
                  .map((g) => (
                    <div
                      key={g.id}
                      className="flex-shrink-0 bg-black/30 rounded-lg px-3 py-2 border border-white/10 text-center min-w-[80px]"
                    >
                      <div className="text-white/50 text-xs">#{g.game_number}</div>
                      <div className="text-white font-bold text-sm">
                        {g.score_a} - {g.score_b}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Matchup Selection */}
            <div className="flex-1 px-4 py-6 space-y-6">
              <h2 className="text-center text-white/70 text-sm font-medium">
                {t("preGame.gameNumber", { number: (summary.games || []).filter((g) => g.ended_at).length + 1 })}
              </h2>

              {/* Team cards */}
              <div className={`grid ${resting !== null ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                {[teamA, teamB, ...(resting !== null ? [resting] : [])].map((captainNum, idx) => {
                  const team = teams.find((t) => t.captainNumber === captainNum);
                  const isResting = resting !== null && idx === 2;
                  return (
                    <motion.div
                      key={captainNum}
                      className={`rounded-xl p-3 border text-center ${
                        isResting
                          ? "bg-black/20 border-white/10 opacity-50"
                          : `bg-black/30 border-white/20`
                      }`}
                    >
                      <div
                        className={`w-12 h-12 mx-auto rounded-full ${getCaptainColor(captainNum)} flex items-center justify-center mb-2`}
                      >
                        {team?.captainPhoto ? (
                          <img src={team.captainPhoto} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-bold">{captainNum}</span>
                        )}
                      </div>
                      <p className="text-white font-medium text-sm truncate">
                        {team?.captainName || getCaptainLabel(captainNum)}
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        {isResting ? t("preGame.resting") : idx === 0 ? t("preGame.home") : t("preGame.away")}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-center text-white/40 text-xs">
                {t("preGame.autoRotation")}
              </div>

              {/* Start Game Button */}
              <Button
                onClick={handleStartGame}
                className="w-full h-16 text-xl font-bold bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/30"
              >
                <Play className="h-6 w-6 mr-2" />
                {t("preGame.startGame")}
              </Button>

              {/* End Night (if games played) */}
              {(summary.games || []).filter((g) => g.ended_at).length > 0 && (
                confirmEndNight ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => { setConfirmEndNight(false); handleEndNight(); }}
                      disabled={endingNight}
                      className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white"
                    >
                      {endingNight ? <Loader2 className="h-4 w-4 animate-spin" /> : t("end.yesEnd")}
                    </Button>
                    <Button
                      onClick={() => setConfirmEndNight(false)}
                      variant="outline"
                      className="h-11 bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                      {t("end.cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmEndNight(true)}
                    variant="outline"
                    className="w-full h-11 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    {t("end.endNight")}
                  </Button>
                )
              )}
            </div>
          </div>
        )}

        {/* ====== ACTIVE GAME VIEW ====== */}
        {view === "active_game" && (
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="px-4 py-2 flex items-center justify-between bg-black/30 backdrop-blur-sm">
              <span className="text-white/60 text-sm font-medium">{t("activeGame.gameNumber", { number: activeGameNumber })}</span>
              <div className="flex items-center gap-1">
                {timer.currentPeriod === "extra_time" && (
                  <span className="text-amber-400 text-xs font-bold px-2 py-0.5 bg-amber-400/20 rounded-full ml-2">
                    {t("activeGame.extraTime")}
                  </span>
                )}
                <Button variant="ghost" size="icon" className="text-white/60 h-8 w-8" onClick={handleToggleMute}>
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </header>

            {/* Scoreboard */}
            <div className="px-4 pt-4">
              <div className="flex items-center justify-center gap-4">
                {/* Team A */}
                <div className="flex-1 text-center">
                  <div className={`w-10 h-10 mx-auto rounded-full ${getCaptainColor(teamA)} flex items-center justify-center mb-1`}>
                    <span className="text-white font-bold text-sm">{teamA}</span>
                  </div>
                  <p className="text-white font-medium text-sm truncate">{getTeamName(teamA)}</p>
                </div>

                {/* Score */}
                <div className="text-center">
                  <div className="text-white font-mono font-black text-5xl tracking-wider">
                    {scoreA} - {scoreB}
                  </div>
                </div>

                {/* Team B */}
                <div className="flex-1 text-center">
                  <div className={`w-10 h-10 mx-auto rounded-full ${getCaptainColor(teamB)} flex items-center justify-center mb-1`}>
                    <span className="text-white font-bold text-sm">{teamB}</span>
                  </div>
                  <p className="text-white font-medium text-sm truncate">{getTeamName(teamB)}</p>
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 space-y-6">
              <motion.div
                key={timer.formattedTime}
                className={`text-8xl font-mono font-black tracking-tight ${
                  timer.remainingMs <= 10_000 ? "text-red-400" : timer.remainingMs <= 60_000 ? "text-amber-400" : "text-white"
                }`}
              >
                {timer.formattedTime}
              </motion.div>

              {/* Play/Pause */}
              <Button
                onClick={() => {
                  if (timer.state === "PLAYING" || timer.state === "EXTRA_TIME") {
                    timer.pause();
                    if (activeGameId) {
                      syncTimerToDb(activeGameId, {
                        timer_paused_at: new Date().toISOString(),
                        timer_elapsed_before_pause: Math.round(timer.totalElapsedMs),
                      });
                    }
                  } else if (timer.state === "PAUSED" || timer.state === "EXTRA_TIME_PAUSED") {
                    timer.resume();
                    if (activeGameId) {
                      syncTimerToDb(activeGameId, {
                        timer_start_at: new Date().toISOString(),
                        timer_paused_at: null,
                      });
                    }
                  }
                }}
                variant="outline"
                className="w-16 h-16 rounded-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                {timer.state === "PLAYING" || timer.state === "EXTRA_TIME" ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>
            </div>

            {/* +Goal Buttons */}
            <div className="px-4 pb-4 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => handleGoalTap(teamA)}
                  disabled={goalDebounce}
                  className={`flex-1 h-16 rounded-xl ${getCaptainColor(teamA)} text-white font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50`}
                >
                  {t("activeGame.goalButton", { team: getTeamName(teamA) })}
                </button>
                <button
                  onClick={() => handleGoalTap(teamB)}
                  disabled={goalDebounce}
                  className={`flex-1 h-16 rounded-xl ${getCaptainColor(teamB)} text-white font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50`}
                >
                  {t("activeGame.goalButton", { team: getTeamName(teamB) })}
                </button>
              </div>

              {/* Undo + End Game */}
              <div className="flex gap-2">
                {goals.length > 0 && (
                  <Button
                    onClick={handleUndoGoal}
                    variant="ghost"
                    className="text-white/50 hover:text-white text-xs"
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    {t("goals.undoLast")}
                  </Button>
                )}
                <div className="flex-1" />
                {confirmEndGame ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => { setConfirmEndGame(false); handleGameEnd(); }}
                      variant="ghost"
                      className="text-red-400 text-xs font-bold"
                    >
                      {t("end.yesEndGame")}
                    </Button>
                    <Button
                      onClick={() => setConfirmEndGame(false)}
                      variant="ghost"
                      className="text-white/50 text-xs"
                    >
                      {t("end.cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmEndGame(true)}
                    variant="ghost"
                    className="text-red-400/70 hover:text-red-400 text-xs"
                  >
                    {t("end.endGame")}
                  </Button>
                )}
              </div>

              {/* Goal Timeline */}
              {goals.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {goals.map((g, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        g.team === teamA ? getCaptainColor(teamA) : getCaptainColor(teamB)
                      } text-white/90`}
                    >
                      ⚽ {g.player_name} {g.minute}'
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== GOAL PICKER ====== */}
        <AnimatePresence>
          {view === "goal_picker" && goalPickerTeam !== null && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 z-40"
                onClick={() => { setGoalPickerTeam(null); setView("active_game"); }}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-purple-900 border-t border-white/10 rounded-t-2xl max-h-[60vh] flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white">{t("goals.selectScorer")}</h3>
                  <button
                    onClick={() => { setGoalPickerTeam(null); setView("active_game"); }}
                    className="p-2 text-white/60 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {getTeamPlayers(goalPickerTeam).map((player) => (
                    <button
                      key={player.id}
                      onClick={() => handleScorerSelected(player)}
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
                      {player.is_captain && (
                        <Crown className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => handleScorerSelected(null)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-center text-white/50 text-sm"
                  >
                    {t("goals.unknown")}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ====== PENALTIES VIEW ====== */}
        {view === "penalties" && (
          <div className="min-h-screen flex flex-col items-center justify-center px-4">
            <h2 className="text-2xl font-heading font-bold text-white mb-2">{t("penalties.title")}</h2>
            <p className="text-white/60 text-sm mb-8">
              {scoreA} - {scoreB}
            </p>
            <div className="flex gap-4 w-full max-w-sm">
              <button
                onClick={() => handlePenaltyWin("team_a_win")}
                className={`flex-1 h-20 rounded-xl ${getCaptainColor(teamA)} text-white font-bold text-lg shadow-lg active:scale-95 transition-transform`}
              >
                {t("penalties.teamWon", { team: getTeamName(teamA) })}
              </button>
              <button
                onClick={() => handlePenaltyWin("team_b_win")}
                className={`flex-1 h-20 rounded-xl ${getCaptainColor(teamB)} text-white font-bold text-lg shadow-lg active:scale-95 transition-transform`}
              >
                {t("penalties.teamWon", { team: getTeamName(teamB) })}
              </button>
            </div>
          </div>
        )}

        {/* ====== GAME OVER VIEW ====== */}
        {view === "game_over" && (
          <div className="min-h-screen flex flex-col items-center justify-center px-4 space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center w-full max-w-sm"
            >
              <h2 className="text-xl font-heading font-bold text-white mb-4">{t("gameOver.title", { number: activeGameNumber })}</h2>

              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full ${getCaptainColor(teamA)} flex items-center justify-center mb-1`}>
                    <span className="text-white font-bold">{teamA}</span>
                  </div>
                  <p className="text-white text-sm truncate max-w-[80px]">{getTeamName(teamA)}</p>
                </div>
                <div className="text-white font-mono font-black text-4xl">
                  {scoreA} - {scoreB}
                </div>
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-full ${getCaptainColor(teamB)} flex items-center justify-center mb-1`}>
                    <span className="text-white font-bold">{teamB}</span>
                  </div>
                  <p className="text-white text-sm truncate max-w-[80px]">{getTeamName(teamB)}</p>
                </div>
              </div>

              {scoreA !== scoreB && (
                <p className="text-purple-400 font-bold mb-4">
                  {t("gameOver.winner", { team: scoreA > scoreB ? getTeamName(teamA) : getTeamName(teamB) })}
                </p>
              )}
            </motion.div>

            <Button
              onClick={handleNextGame}
              className="w-full max-w-sm h-14 text-lg font-bold bg-purple-500 hover:bg-purple-600 text-white"
            >
              <Play className="h-5 w-5 mr-2" />
              {t("gameOver.nextGame")}
            </Button>

            {confirmEndNight ? (
              <div className="flex gap-2 w-full max-w-sm">
                <Button
                  onClick={() => { setConfirmEndNight(false); handleEndNight(); }}
                  disabled={endingNight}
                  className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white"
                >
                  {endingNight ? <Loader2 className="h-4 w-4 animate-spin" /> : t("end.yesEndGame")}
                </Button>
                <Button
                  onClick={() => setConfirmEndNight(false)}
                  variant="outline"
                  className="h-11 bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  {t("end.cancel")}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setConfirmEndNight(true)}
                variant="outline"
                className="w-full max-w-sm h-11 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                {t("end.endNight")}
              </Button>
            )}
          </div>
        )}

        {/* ====== SUMMARY VIEW ====== */}
        {view === "summary" && summary && (
          <div className="min-h-screen">
            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-center gap-2 bg-black/20 backdrop-blur-sm border-b border-white/10">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <h1 className="text-lg font-bold text-white">{t("summary.title")}</h1>
            </header>

            <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
              {/* Club + Date */}
              <div className="text-center">
                {summary.club_name && (
                  <p className="text-white/60 text-sm">{summary.club_name}</p>
                )}
                <p className="text-white/40 text-xs">
                  {format(new Date(summary.started_at), "EEEE, MMMM d, yyyy")}
                </p>
              </div>

              {/* Stats Banner */}
              <div className="bg-black/30 rounded-xl p-4 border border-white/10 text-center">
                <div className="flex justify-center gap-8">
                  <div>
                    <p className="text-3xl font-bold text-white">{summary.total_games}</p>
                    <p className="text-white/50 text-xs">{t("summary.games")}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{summary.total_goals}</p>
                    <p className="text-white/50 text-xs">{t("summary.totalGoals")}</p>
                  </div>
                </div>
              </div>

              {/* Game Results */}
              {(summary.games || []).filter((g) => g.ended_at).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-white/70 text-sm font-medium">{t("summary.results")}</h3>
                  {(summary.games || [])
                    .filter((g) => g.ended_at)
                    .map((g) => {
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
                              {getTeamName(g.team_a_captain_number)}
                            </span>
                            <span className="text-white font-bold text-base">
                              {g.score_a} - {g.score_b}
                            </span>
                            <span className={`text-sm font-medium ${isBWin ? "text-purple-400" : "text-white/70"}`}>
                              {getTeamName(g.team_b_captain_number)}
                            </span>
                          </div>
                          {g.penalty_score_a != null && (
                            <span className="text-white/40 text-xs">{t("summary.penalties")}</span>
                          )}
                          {/* Goal scorers */}
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
              {summary.standings?.length > 0 && (
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
                    {summary.standings.map((s, i) => (
                      <div
                        key={s.captain_number}
                        className={`grid grid-cols-6 gap-1 px-3 py-2.5 ${i === 0 ? "bg-yellow-400/10" : ""}`}
                      >
                        <span className="col-span-2 text-white text-sm font-medium flex items-center gap-1.5">
                          {i === 0 && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                          {getTeamName(s.captain_number)}
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
              {summary.top_scorers?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-white/70 text-sm font-medium">{t("summary.topScorer")}</h3>
                  <div className="space-y-2">
                    {summary.top_scorers.slice(0, 3).map((scorer, i) => (
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
                          {scorer.goals} ⚽
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={shareViaWhatsApp}
                  className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white h-12 text-base"
                >
                  <MessageCircle className="h-5 w-5" />
                  {t("summary.shareWhatsApp")}
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 h-10"
                >
                  <Link to="/dashboard">
                    <Home className="h-4 w-4" />
                    {t("summary.backToDashboard")}
                  </Link>
                </Button>
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
        )}
      </div>
    </div>
  );
}
