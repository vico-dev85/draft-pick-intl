import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Loader2, Trophy, Eye, EyeOff, Flame, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface PlayerStats {
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  max_points: number;
  success_rate: number;
  goals: number;
  assists: number;
  gpg: number;
  apg: number;
  best_night_goals: number;
  best_night_date: string | null;
  recent_form: ("W" | "D" | "L")[];
  timeline: { night_id: string; date: string; goals: number; assists: number }[];
}

interface ClubLeaderboards {
  top_scorers: { player_id: string; player_name: string; player_photo: string | null; goals: number }[];
  top_assisters: { player_id: string; player_name: string; player_photo: string | null; assists: number }[];
  top_success_rate: { player_id: string; player_name: string; player_photo: string | null; success_rate: number; games_played: number }[];
  club_avg_gpg: number;
  club_avg_apg: number;
  club_avg_success_rate: number;
  qualifying_player_count: number;
}

const TROPHIES = ["🏆", "🥈", "🥉"];

// ──────────────────────────────────────────────────────────────────────
// PlayerStatsCard — private personal stats, only visible to the player
// ──────────────────────────────────────────────────────────────────────
export function PlayerStatsCard({
  playerId,
  playerName,
  playerPhoto,
  clubAvg,
}: {
  playerId: string | null;
  playerName: string;
  playerPhoto?: string | null;
  clubAvg?: { gpg: number; apg: number; success_rate: number };
}) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(!!playerId);

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      setStats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_player_stats", { p_player_id: playerId });
        if (error) throw error;
        if (!cancelled) setStats(data as PlayerStats);
      } catch (err) {
        console.error("Error fetching player stats:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No player record → owner hasn't added themselves to the player pool yet
  if (!playerId) {
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground text-xs font-medium">Only you can see your stats</span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">📊</div>
          <h3 className="text-foreground font-heading font-bold text-lg">Add yourself to the player pool</h3>
          <p className="text-muted-foreground text-sm mt-2 mb-3">
            Add yourself as a player in your club to start tracking goals, assists, wins, and success rate over time.
          </p>
          <a
            href="#/players"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors"
          >
            Open Player Pool →
          </a>
        </div>
      </div>
    );
  }

  // Player exists but hasn't played any games yet
  if (!stats || stats.games_played === 0) {
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground text-xs font-medium">Only you can see your stats</span>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/70 via-purple-800/50 to-purple-900/70 p-5">
          <div className="flex items-center gap-3 mb-4">
            <PlayerAvatar name={playerName} photoUrl={playerPhoto} size="lg" className="border-2 border-white/40" />
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-heading font-bold text-xl truncate">{playerName}</h3>
              <p className="text-white/60 text-xs uppercase tracking-wider">Your Stats — all time</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <StatTile label="Games" value={0} icon="🏟️" />
            <StatTile label="Goals" value={0} icon="⚽" />
            <StatTile label="Assists" value={0} iconImg="/assets/icons/chef-hat.webp" />
            <StatTile label="W-D-L" value="0-0-0" icon="🏆" small />
          </div>
          <div className="text-center text-white/70 text-sm px-2 py-3 rounded-lg bg-white/5 border border-white/10">
            ⚽ Play your first game night to fill this card with goals, assists, and your success rate.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Privacy label */}
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground text-xs font-medium">Only you can see your stats</span>
      </div>

      {/* Trading-card style hero */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/70 via-purple-800/50 to-purple-900/70 p-5 shadow-lg shadow-purple-900/40">
        {/* Decorative pitch lines */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white" />
        </div>

        {/* Player header */}
        <div className="relative flex items-center gap-3 mb-5">
          <PlayerAvatar name={playerName} photoUrl={playerPhoto} size="lg" className="border-2 border-white/40" />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-heading font-bold text-xl truncate">{playerName}</h3>
            <p className="text-white/60 text-xs uppercase tracking-wider">Your Stats — all time</p>
          </div>
          {stats.recent_form[0] === "W" && stats.recent_form[1] === "W" && stats.recent_form[2] === "W" && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-amber-300 text-xs font-bold">Hot</span>
            </div>
          )}
        </div>

        {/* Hero: success rate big number */}
        <div className="relative flex items-end justify-between mb-5">
          <div>
            <div className="text-white font-mono font-black text-6xl leading-none">
              {stats.success_rate}<span className="text-3xl text-white/60">%</span>
            </div>
            <div className="text-white/60 text-xs uppercase tracking-wider mt-1">
              Success rate
              {clubAvg && (
                <DeltaPill value={stats.success_rate} avg={clubAvg.success_rate} suffix="%" />
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/70 text-xs uppercase tracking-wider">Form</div>
            <div className="flex gap-1 mt-1">
              {stats.recent_form.slice(0, 5).map((r, i) => (
                <FormChip key={i} letter={r} />
              ))}
              {stats.recent_form.length === 0 && (
                <span className="text-white/30 text-xs">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="relative grid grid-cols-4 gap-2 mb-5">
          <StatTile label="Games" value={stats.games_played} icon="🏟️" />
          <StatTile label="Goals" value={stats.goals} icon="⚽" />
          <StatTile label="Assists" value={stats.assists} iconImg="/assets/icons/chef-hat.webp" />
          <StatTile label="W-D-L" value={`${stats.wins}-${stats.draws}-${stats.losses}`} icon="🏆" small />
        </div>

        {/* Per-game with comparisons */}
        <div className="relative space-y-2 mb-5">
          <ComparisonRow
            label="Goals / game"
            value={stats.gpg}
            avg={clubAvg?.gpg}
            iconImg={null}
            icon="⚽"
          />
          <ComparisonRow
            label="Assists / game"
            value={stats.apg}
            avg={clubAvg?.apg}
            iconImg="/assets/icons/chef-hat.webp"
            icon={null}
          />
        </div>

        {/* Best night */}
        {stats.best_night_goals > 0 && stats.best_night_date && (
          <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-400/20">
            <Trophy className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-amber-300 text-sm font-bold">Best night: </span>
              <span className="text-amber-100 text-sm">
                {stats.best_night_goals} ⚽ on {format(new Date(stats.best_night_date), "MMM d")}
              </span>
            </div>
          </div>
        )}

        {/* Timeline */}
        {stats.timeline.length > 0 && (
          <div className="relative mt-5">
            <div className="text-white/60 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>Timeline</span>
              <span className="text-white/30">·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-lime-400" />
                <span>Goals</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white/80" />
                <span>Assists</span>
              </span>
            </div>
            <StatsTimeline timeline={stats.timeline} clubAvgGoals={clubAvg?.gpg} />
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  icon,
  iconImg,
  small,
}: {
  label: string;
  value: string | number;
  icon?: string;
  iconImg?: string;
  small?: boolean;
}) {
  return (
    <div className="bg-white/8 rounded-lg p-2 text-center border border-white/10">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        {iconImg ? (
          <img src={iconImg} alt="" className="w-3.5 h-3.5" />
        ) : icon ? (
          <span className="text-xs">{icon}</span>
        ) : null}
      </div>
      <div className={`text-white font-mono font-bold ${small ? "text-lg" : "text-2xl"} leading-none`}>{value}</div>
      <div className="text-white/50 text-[10px] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function FormChip({ letter }: { letter: "W" | "D" | "L" }) {
  const color =
    letter === "W" ? "bg-green-500/30 text-green-200 border-green-400/40" :
    letter === "L" ? "bg-red-500/30 text-red-200 border-red-400/40" :
                     "bg-amber-500/30 text-amber-200 border-amber-400/40";
  return (
    <span className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center border ${color}`}>
      {letter}
    </span>
  );
}

function DeltaPill({ value, avg, suffix }: { value: number; avg: number; suffix?: string }) {
  if (avg === 0) return null;
  const delta = value - avg;
  if (Math.abs(delta) < 0.01) return null;
  const positive = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 ml-2 text-xs font-bold ${positive ? "text-green-300" : "text-red-300"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{delta.toFixed(suffix === "%" ? 0 : 2)}{suffix ?? ""}
    </span>
  );
}

function ComparisonRow({
  label,
  value,
  avg,
  icon,
  iconImg,
}: {
  label: string;
  value: number;
  avg?: number;
  icon?: string | null;
  iconImg?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
        {iconImg ? <img src={iconImg} alt="" className="w-4 h-4" /> : <span>{icon}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium">{label}</div>
        {avg !== undefined && avg > 0 && (
          <div className="text-white/40 text-[11px]">Club avg: {avg.toFixed(2)}</div>
        )}
      </div>
      <div className="text-right">
        <div className="text-white font-mono font-bold text-lg leading-none">{value.toFixed(2)}</div>
        {avg !== undefined && <DeltaPill value={value} avg={avg} />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// StatsTimeline — stacked bars (goals + assists) per game night, +
// dashed line at the club average goals/game
// ──────────────────────────────────────────────────────────────────────
function StatsTimeline({
  timeline,
  clubAvgGoals,
}: {
  timeline: { night_id: string; date: string; goals: number; assists: number }[];
  clubAvgGoals?: number;
}) {
  // Show the last 20 game nights to keep chart readable
  const data = timeline.slice(-20);
  if (data.length === 0) return null;

  const maxY = Math.max(2, ...data.flatMap((d) => [d.goals, d.assists]));

  // Layout
  const W = 360;
  const H = 170;
  const padLeft = 20;     // Y-axis tick numbers
  const padRight = 12;
  const padTop = 14;
  const padBottom = 40;   // dates + axis labels
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  // X position per index: evenly spaced (each point = one session)
  const xAt = (i: number) =>
    data.length === 1
      ? padLeft + chartW / 2
      : padLeft + (i * chartW) / (data.length - 1);
  const yAt = (v: number) => padTop + chartH - (v / maxY) * chartH;

  // Build SVG paths for the two lines
  const buildPath = (key: "goals" | "assists") =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(d[key]).toFixed(1)}`)
      .join(" ");

  const goalsPath = buildPath("goals");
  const assistsPath = buildPath("assists");

  // Y-axis grid + tick values (just 0, mid, max for cleanliness)
  const yTicks = [0, Math.ceil(maxY / 2), maxY];

  // X-axis date labels: show first / last always, plus 1-2 in the middle if room
  const dateLabels =
    data.length <= 5
      ? data.map((d, i) => ({ i, label: format(new Date(d.date), "MMM d") }))
      : [
          { i: 0, label: format(new Date(data[0].date), "MMM d") },
          { i: Math.floor(data.length / 2), label: format(new Date(data[Math.floor(data.length / 2)].date), "MMM d") },
          { i: data.length - 1, label: format(new Date(data[data.length - 1].date), "MMM d") },
        ];

  const clubAvgY = clubAvgGoals && clubAvgGoals > 0 && clubAvgGoals <= maxY ? yAt(clubAvgGoals) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 200 }}>
      {/* Y-axis grid lines + tick labels */}
      {yTicks.map((v) => (
        <g key={`y-${v}`}>
          <line
            x1={padLeft}
            y1={yAt(v)}
            x2={W - padRight}
            y2={yAt(v)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
          <text
            x={padLeft - 4}
            y={yAt(v) + 3}
            fontSize="9"
            fill="rgba(255,255,255,0.4)"
            textAnchor="end"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Club avg goals — dashed reference line */}
      {clubAvgY !== null && (
        <>
          <line
            x1={padLeft}
            y1={clubAvgY}
            x2={W - padRight}
            y2={clubAvgY}
            stroke="rgba(163, 230, 53, 0.5)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={W - padRight - 2}
            y={clubAvgY - 3}
            fontSize="8"
            fill="rgba(163, 230, 53, 0.7)"
            textAnchor="end"
            fontWeight={700}
          >
            club avg goals
          </text>
        </>
      )}

      {/* Assists line (white-ish, under goals so green pops on top) */}
      <path d={assistsPath} stroke="rgba(255,255,255,0.85)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Goals line (lime/green) */}
      <path d={goalsPath} stroke="#a3e635" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <g key={d.night_id}>
          {/* Assists dot */}
          <circle
            cx={xAt(i)}
            cy={yAt(d.assists)}
            r={3}
            fill="rgba(255,255,255,0.95)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={1}
          />
          {/* Goals dot */}
          <circle
            cx={xAt(i)}
            cy={yAt(d.goals)}
            r={3.5}
            fill="#a3e635"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={1}
          />
        </g>
      ))}

      {/* X-axis baseline */}
      <line
        x1={padLeft}
        y1={padTop + chartH}
        x2={W - padRight}
        y2={padTop + chartH}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
      />

      {/* Date labels */}
      {dateLabels.map(({ i, label }) => (
        <g key={`d-${i}`}>
          <line
            x1={xAt(i)}
            y1={padTop + chartH}
            x2={xAt(i)}
            y2={padTop + chartH + 3}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
          <text
            x={xAt(i)}
            y={padTop + chartH + 14}
            fontSize="9"
            fill="rgba(255,255,255,0.55)"
            textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
          >
            {label}
          </text>
        </g>
      ))}

      {/* Sessions count footer */}
      <text
        x={W / 2}
        y={H - 4}
        fontSize="9"
        fill="rgba(255,255,255,0.4)"
        textAnchor="middle"
      >
        {data.length} session{data.length === 1 ? "" : "s"}
      </text>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ClubLeaderboardsCard — public, everyone in the club sees this
// ──────────────────────────────────────────────────────────────────────
export function ClubLeaderboardsCard({ clubId }: { clubId: string }) {
  const [data, setData] = useState<ClubLeaderboards | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_club_leaderboards", { p_club_id: clubId });
        if (error) throw error;
        if (!cancelled) setData(data as ClubLeaderboards);
      } catch (err) {
        console.error("Error fetching leaderboards:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || (data.top_scorers.length === 0 && data.top_assisters.length === 0)) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">🏟️</div>
        <h3 className="text-foreground font-heading font-bold text-lg">Club leaderboards</h3>
        <p className="text-muted-foreground text-sm mt-2">
          Play a few game nights and the top scorers, assists, and success rates will show up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Public label */}
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground text-xs font-medium">Club leaderboards · everyone sees this</span>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="space-y-0 divide-y divide-border">
          <LeaderboardSection
            title="Top Scorers"
            icon="⚽"
            rows={data.top_scorers.map((s) => ({
              player_id: s.player_id,
              name: s.player_name,
              photo: s.player_photo,
              value: s.goals,
              suffix: "⚽",
            }))}
          />
          <LeaderboardSection
            title="Top Assists"
            iconImg="/assets/icons/chef-hat.webp"
            rows={data.top_assisters.map((s) => ({
              player_id: s.player_id,
              name: s.player_name,
              photo: s.player_photo,
              value: s.assists,
              suffixImg: "/assets/icons/chef-hat.webp",
            }))}
          />
          <LeaderboardSection
            title="Success Rate"
            icon="🏆"
            rows={data.top_success_rate.map((s) => ({
              player_id: s.player_id,
              name: s.player_name,
              photo: s.player_photo,
              value: s.success_rate,
              suffix: "%",
              subtitle: `${s.games_played} games`,
            }))}
          />
        </div>

        {/* Club averages footer */}
        <div className="px-4 py-3 bg-muted/30 border-t border-border text-center">
          <p className="text-muted-foreground text-xs">
            <span className="text-foreground/70 font-semibold">Club average:</span>{" "}
            {data.club_avg_gpg.toFixed(2)} gpg · {data.club_avg_apg.toFixed(2)} apg · {Math.round(data.club_avg_success_rate)}% sr
            <span className="text-muted-foreground/60"> · {data.qualifying_player_count} players (≥3 games)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function LeaderboardSection({
  title,
  icon,
  iconImg,
  rows,
}: {
  title: string;
  icon?: string;
  iconImg?: string;
  rows: {
    player_id: string;
    name: string;
    photo: string | null;
    value: number;
    suffix?: string;
    suffixImg?: string;
    subtitle?: string;
  }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="p-4">
      <h4 className="text-foreground font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
        {iconImg ? <img src={iconImg} alt="" className="w-4 h-4" /> : <span>{icon}</span>}
        {title}
      </h4>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          const trophy = i < 3 ? TROPHIES[i] : null;
          return (
            <div key={row.player_id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
              <div className="w-6 text-center font-bold text-sm text-muted-foreground">
                {trophy ?? i + 1}
              </div>
              <PlayerAvatar name={row.name} photoUrl={row.photo} size="xs" />
              <div className="flex-1 min-w-0">
                <div className="text-foreground text-sm font-medium truncate">{row.name}</div>
                {row.subtitle && <div className="text-muted-foreground text-[10px]">{row.subtitle}</div>}
              </div>
              <div className="text-foreground font-bold text-base flex items-center gap-1">
                {row.value}
                {row.suffixImg ? (
                  <img src={row.suffixImg} alt="" className="w-4 h-4" />
                ) : row.suffix ? (
                  <span className="text-muted-foreground text-sm">{row.suffix}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
