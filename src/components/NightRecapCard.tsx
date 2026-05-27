import { forwardRef } from "react";
import { TeamSymbol } from "@/components/TeamSymbol";
import { getTeamDisplayName } from "@/lib/captainHelpers";

interface Standing {
  captain_number: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

interface Scorer {
  player_id: string;
  player_name: string;
  player_photo?: string | null;
  goals: number;
}

interface Assister {
  player_id: string;
  player_name: string;
  player_photo?: string | null;
  assists: number;
}

interface CaptainNameMap {
  [captainNumber: number]: string | null;
}

interface NightRecapCardProps {
  draftName: string | null;
  clubName?: string | null;
  clubLogoUrl?: string | null;
  roomCode: string;
  startedAt?: string | null;
  totalGames: number;
  totalGoals: number;
  standings: Standing[];
  topScorers: Scorer[];
  topAssists: Assister[];
  captainNames: CaptainNameMap;
}

const RANK_TROPHIES = ["🏆", "🥈", "🥉"];

/** Format a date like "Tuesday, May 26" */
function formatNightDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Take top N + ties: include everyone whose count equals the Nth-place count.
 * If fewer than N entries exist, returns the lot.
 */
function topWithTies<T extends { goals?: number; assists?: number }>(
  list: T[],
  n: number,
  key: "goals" | "assists",
): T[] {
  if (list.length <= n) return list;
  const cutoff = list[n - 1][key];
  return list.filter((x) => (x[key] ?? 0) >= (cutoff ?? 0));
}

function PlayerStatRow({
  rank,
  photo,
  name,
  count,
  unit,
}: {
  rank: number;
  photo?: string | null;
  name: string;
  count: number;
  /** Symbol next to the count — emoji string OR image URL. Image URLs end with .webp/.png/.svg. */
  unit: string;
}) {
  const isImage = /\.(webp|png|svg|jpg|jpeg)$/i.test(unit);
  const trophy = rank <= 3 ? RANK_TROPHIES[rank - 1] : "";
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 12px 12px",
      minHeight: 64,
      borderRadius: 10,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{
        width: 28,
        textAlign: "center",
        fontSize: trophy ? 24 : 18,
        fontWeight: 800,
        color: "rgba(255,255,255,0.6)",
        lineHeight: 1,
      }}>
        {trophy || rank}
      </div>
      {photo ? (
        <img
          src={photo}
          alt=""
          crossOrigin="anonymous"
          style={{
            width: 40, height: 40, borderRadius: "50%", objectFit: "cover",
            border: "2px solid rgba(255,255,255,0.4)",
          }}
        />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "2px solid rgba(255,255,255,0.4)",
        }} />
      )}
      <span style={{
        flex: 1,
        color: "#fff",
        fontFamily: "'Rubik', 'Heebo', 'Inter', sans-serif",
        fontSize: 17,
        fontWeight: 600,
        lineHeight: 1.8,
        whiteSpace: "nowrap",
        overflow: "hidden",
        display: "inline-block",
        paddingTop: 2,
      }}>{name}</span>
      <span style={{
        color: "#fff",
        fontSize: 20,
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
      }}>
        {count}
        {isImage ? (
          <img
            src={unit}
            alt=""
            crossOrigin="anonymous"
            style={{
              display: "inline-block",
              width: 22,
              height: 22,
              marginLeft: 5,
              verticalAlign: "-5px",
              objectFit: "contain",
            }}
          />
        ) : (
          <span style={{ fontSize: 14, marginLeft: 4, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{unit}</span>
        )}
      </span>
    </div>
  );
}

export const NightRecapCard = forwardRef<HTMLDivElement, NightRecapCardProps>(
  ({
    draftName,
    clubName,
    clubLogoUrl,
    roomCode,
    startedAt,
    totalGames,
    totalGoals,
    standings,
    topScorers,
    topAssists,
    captainNames,
  }, ref) => {
    const dateStr = formatNightDate(startedAt);
    const subtitle = [
      dateStr,
      `${totalGames} ${totalGames === 1 ? "game" : "games"}`,
      `${totalGoals} ${totalGoals === 1 ? "goal" : "goals"}`,
    ].filter(Boolean).join(" · ");

    const scorers = topWithTies(topScorers, 5, "goals");
    const assists = topWithTies(topAssists, 5, "assists");

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: 1080,
          height: 1350,
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          background: "#0a0a1a",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header (white) */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          background: "#ffffff",
          height: 76,
          boxSizing: "border-box",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/logo.png" alt="" crossOrigin="anonymous" style={{ height: 32 }} />
            {clubLogoUrl && (
              <>
                <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.15)" }} />
                <img
                  src={clubLogoUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ height: 36, width: 36, borderRadius: 6, objectFit: "cover" }}
                />
                {clubName && (
                  <div style={{
                    color: "rgba(0,0,0,0.78)",
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                  }}>{clubName}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Purple accent line */}
        <div style={{
          height: 4,
          background: "linear-gradient(90deg, #7C3AED, #a855f7, #7C3AED)",
          flexShrink: 0,
        }} />

        {/* Body — stadium bg */}
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          <img
            src="/assets/bg/share-stadium.jpg"
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition: "center 30%",
            }}
          />
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "linear-gradient(180deg, rgba(10,10,26,0.65) 0%, rgba(10,10,26,0.82) 50%, rgba(10,10,26,0.7) 100%)",
          }} />

          <div style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "20px 28px 18px",
            boxSizing: "border-box",
          }}>
            {/* Title — club logo top-left as a hero crest, title stays centered */}
            <div style={{ marginBottom: 18, flexShrink: 0, textAlign: "center", position: "relative", minHeight: 120 }}>
              {clubLogoUrl && (
                <img
                  src={clubLogoUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 120,
                    height: 120,
                    objectFit: "contain",
                    filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.6))",
                  }}
                />
              )}
              <div style={{
                color: "#fff",
                fontSize: 46,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                textShadow: "0 2px 20px rgba(0,0,0,0.7)",
                lineHeight: 1.05,
                paddingTop: 30,
              }}>
                {draftName || "Game Night"} — Recap
              </div>
              {subtitle && (
                <div style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 18,
                  fontWeight: 600,
                  marginTop: 8,
                }}>
                  {subtitle}
                </div>
              )}
            </div>

            {/* STANDINGS */}
            <SectionHeading text="STANDINGS" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {standings.map((s, idx) => {
                const captainName = captainNames[s.captain_number] ?? null;
                const displayName = getTeamDisplayName(roomCode, s.captain_number, captainName);
                const games = s.wins + s.draws + s.losses;
                const maxPoints = games * 3;
                const successRate = maxPoints > 0 ? Math.round((s.points / maxPoints) * 100) : 0;
                const gd = s.goals_for - s.goals_against;
                const trophy = idx < 3 ? RANK_TROPHIES[idx] : "";

                return (
                  <div key={s.captain_number} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}>
                    <div style={{
                      fontSize: 30,
                      width: 36,
                      textAlign: "center",
                      lineHeight: 1,
                      color: idx < 3 ? "#fff" : "rgba(255,255,255,0.5)",
                      fontWeight: 800,
                    }}>
                      {trophy || idx + 1}
                    </div>
                    <TeamSymbol
                      roomCode={roomCode}
                      teamNumber={s.captain_number}
                      captainName={captainName}
                      size={72}
                      variant="badge"
                      forCanvas
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: "#fff",
                        fontFamily: "'Rubik', 'Heebo', 'Inter', sans-serif",
                        fontSize: 22,
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}>
                        {displayName}
                      </div>
                      <div style={{
                        color: "rgba(255,255,255,0.75)",
                        fontSize: 15,
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}>
                        {s.wins}W {s.draws}D {s.losses}L · GD {gd >= 0 ? `+${gd}` : gd} · {successRate}%
                      </div>
                    </div>
                    <div style={{
                      textAlign: "right",
                      color: "#fff",
                      fontSize: 28,
                      fontWeight: 900,
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {s.points}
                      <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.6)",
                        marginTop: 4,
                      }}>PTS</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* TOP SCORERS + TOP ASSISTS (two columns) */}
            <div style={{
              display: "flex",
              gap: 14,
              flex: 1,
              minHeight: 0,
            }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <SectionHeading text="TOP SCORERS" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {scorers.length === 0 && <EmptyHint text="No goals yet" />}
                  {scorers.map((p, i) => (
                    <PlayerStatRow
                      key={p.player_id}
                      rank={i + 1}
                      photo={p.player_photo}
                      name={p.player_name}
                      count={p.goals}
                      unit="⚽"
                    />
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <SectionHeading text="TOP ASSISTS" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {assists.length === 0 && <EmptyHint text="No assists tracked" />}
                  {assists.map((p, i) => (
                    <PlayerStatRow
                      key={p.player_id}
                      rank={i + 1}
                      photo={p.player_photo}
                      name={p.player_name}
                      count={p.assists}
                      unit="/assets/icons/chef-hat.webp"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              paddingTop: 14,
            }}>
              <div style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 15,
                fontWeight: 700,
              }}>picknkick.com</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

NightRecapCard.displayName = "NightRecapCard";

function SectionHeading({ text }: { text: string }) {
  return (
    <div style={{
      color: "#a3e635",
      fontSize: 14,
      fontWeight: 800,
      letterSpacing: "0.12em",
      marginBottom: 8,
      textTransform: "uppercase",
    }}>
      {text}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{
      color: "rgba(255,255,255,0.4)",
      fontSize: 14,
      fontStyle: "italic",
      padding: "8px 12px",
      textAlign: "center",
    }}>
      {text}
    </div>
  );
}
