import { forwardRef } from "react";

const TEAM_OVERLAY: Record<number, string> = {
  1: "rgba(37, 99, 235, 0.35)",
  2: "rgba(220, 38, 38, 0.35)",
  3: "rgba(217, 119, 6, 0.35)",
  4: "rgba(22, 163, 74, 0.35)",
  5: "rgba(219, 39, 119, 0.35)",
};

const TEAM_COLORS: Record<number, string> = {
  1: "#3B82F6",
  2: "#EF4444",
  3: "#F59E0B",
  4: "#22C55E",
  5: "#EC4899",
};

// Deterministic color from name for placeholder avatars
const AVATAR_BG_COLORS = [
  "#6D28D9", "#2563EB", "#DC2626", "#D97706",
  "#16A34A", "#DB2777", "#0891B2", "#4F46E5",
];
function getAvatarBg(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_BG_COLORS[hash % AVATAR_BG_COLORS.length];
}

type FormationPlayer = { id: string; display_name: string; photo_url?: string | null; isCaptain?: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getFormationRows(
  captainName: string,
  captainPhoto: string | null | undefined,
  pickedPlayers: { id: string; display_name: string; photo_url?: string | null }[],
  isSoloDraft: boolean,
): FormationPlayer[][] {
  const captain: FormationPlayer = { id: "__captain__", display_name: captainName, photo_url: captainPhoto, isCaptain: true };
  const allPlayers: FormationPlayer[] = isSoloDraft
    ? pickedPlayers.map(p => ({ ...p }))
    : [captain, ...pickedPlayers.map(p => ({ ...p }))];

  const n = allPlayers.length;
  if (n <= 1) return [allPlayers];

  const frontRow = allPlayers.slice(0, 2);
  const remaining = allPlayers.slice(2);

  if (remaining.length === 0) return [frontRow];

  const shuffled = shuffle(remaining);

  if (shuffled.length <= 4) {
    return [shuffled, frontRow];
  }
  const mid = Math.ceil(shuffled.length / 2);
  return [shuffled.slice(0, mid), shuffled.slice(mid), frontRow];
}

interface Team {
  number: number;
  name: string;
  photoUrl?: string | null;
  players: { id: string; display_name: string; photo_url?: string | null }[];
}

interface ShareCardProps {
  draftName: string;
  teams: Team[];
  location?: string | null;
  notes?: string | null;
  isSoloDraft?: boolean;
  clubName?: string | null;
  clubLogoUrl?: string | null;
}

/** Inline SVG silhouette for players without photos */
function SilhouetteAvatar({ size, bgColor }: { size: number; bgColor: string }) {
  const iconSize = Math.round(size * 0.55);
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: bgColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      border: "2px solid rgba(255,255,255,0.9)",
      overflow: "hidden",
    }}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 28"
        fill="none"
        style={{ marginTop: Math.round(size * 0.12) }}
      >
        <circle cx="12" cy="8" r="5" fill="rgba(255,255,255,0.8)" />
        <path d="M2 26c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="rgba(255,255,255,0.6)" />
      </svg>
    </div>
  );
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ draftName, teams, location, isSoloDraft, clubName, clubLogoUrl }, ref) => {
    const numTeams = teams.length;
    const cardWidth = numTeams === 3 ? 720 : 600;
    const pitchWidth = numTeams === 3 ? 210 : 260;
    const pitchHeight = numTeams === 3 ? 310 : 360;
    const avatarSize = numTeams === 3 ? 34 : 40;
    const fontSize = numTeams === 3 ? 10 : 11;
    // Team name font — smaller for 3 teams so it doesn't truncate
    const teamNameSize = 13;

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: cardWidth,
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          background: "#0a0a1a",
          overflow: "hidden",
        }}
      >
        {/* 1. White header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "#ffffff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/logo.png"
              alt=""
              crossOrigin="anonymous"
              style={{ height: 22 }}
            />
            {clubLogoUrl && (
              <>
                <div style={{ width: 1, height: 18, background: "rgba(0,0,0,0.15)" }} />
                <img
                  src={clubLogoUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ height: 24, width: 24, borderRadius: 4, objectFit: "cover" }}
                />
              </>
            )}
          </div>
          {location && (
            <div style={{ color: "rgba(0,0,0,0.5)", fontSize: 11, fontWeight: 500 }}>
              {location}
            </div>
          )}
        </div>

        {/* 6. Purple accent line under header */}
        <div style={{
          height: 3,
          background: "linear-gradient(90deg, #7C3AED, #a855f7, #7C3AED)",
        }} />

        {/* Body — stadium background */}
        <div style={{ position: "relative" }}>
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
            background: "linear-gradient(180deg, rgba(10,10,26,0.5) 0%, rgba(10,10,26,0.7) 40%, rgba(10,10,26,0.6) 100%)",
          }} />

          <div style={{ position: "relative" }}>
            {/* 4. Draft name — bigger & bolder */}
            <div style={{
              textAlign: "center",
              padding: "20px 20px 14px",
            }}>
              <div style={{
                color: "#fff",
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                textShadow: "0 2px 16px rgba(0,0,0,0.6)",
              }}>
                {draftName}
              </div>
            </div>

            {/* Pitches */}
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: numTeams === 3 ? 8 : 14,
              padding: `0 ${numTeams === 3 ? 12 : 20}px 16px`,
            }}>
              {teams.map((team) => {
                const teamColor = TEAM_COLORS[team.number] || TEAM_COLORS[1];
                const overlay = TEAM_OVERLAY[team.number] || TEAM_OVERLAY[1];
                const formationRows = getFormationRows(team.name, team.photoUrl, team.players, !!isSoloDraft);

                return (
                  <div key={team.number} style={{ width: pitchWidth }}>
                    {/* 1. Team name — adjusted font for 3-team */}
                    <div style={{
                      textAlign: "center",
                      marginBottom: 6,
                      color: teamColor,
                      fontSize: teamNameSize,
                      fontWeight: 800,
                      textShadow: `0 1px 8px rgba(0,0,0,0.6)`,
                      letterSpacing: "0.03em",
                      padding: "0 4px",
                    }}>
                      {isSoloDraft ? team.name : `Team ${team.name}`}
                    </div>

                    {/* Half pitch */}
                    <div style={{
                      position: "relative",
                      width: pitchWidth,
                      height: pitchHeight,
                    }}>
                      {/* 7. Brighter pitch border */}
                      <div style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: 10,
                        overflow: "hidden",
                        border: `2px solid ${teamColor}90`,
                        boxShadow: `0 4px 24px ${teamColor}40`,
                      }}>
                        <img
                          src="/assets/bg/pitch-half.jpg"
                          alt=""
                          crossOrigin="anonymous"
                          style={{
                            position: "absolute",
                            top: 0, left: 0,
                            width: "100%", height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <div style={{
                          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                          background: overlay,
                        }} />
                        <div style={{
                          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                          background: "rgba(0,0,0,0.15)",
                        }} />
                      </div>

                      {/* Formation */}
                      <div style={{
                        position: "relative",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-evenly",
                        padding: "10px 4px 16px",
                      }}>
                        {[...formationRows].reverse().map((row, rowIdx, allRows) => {
                          const isFrontRow = rowIdx === allRows.length - 1;
                          return (
                          <div
                            key={rowIdx}
                            style={{
                              display: "flex",
                              justifyContent: isFrontRow ? "space-evenly" : "center",
                              gap: isFrontRow ? undefined : 0,
                              alignItems: "center",
                            }}
                          >
                            {row.map((player) => (
                              <div
                                key={player.id}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 2,
                                  width: avatarSize + 20,
                                  position: "relative",
                                }}
                              >
                                {/* 3. Avatar — photo or silhouette placeholder */}
                                <div style={{ position: "relative" }}>
                                  {player.photo_url ? (
                                    <img
                                      src={player.photo_url}
                                      alt=""
                                      crossOrigin="anonymous"
                                      style={{
                                        width: avatarSize,
                                        height: avatarSize,
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                                        border: "2px solid rgba(255,255,255,0.9)",
                                      }}
                                    />
                                  ) : (
                                    <SilhouetteAvatar
                                      size={avatarSize}
                                      bgColor={getAvatarBg(player.display_name)}
                                    />
                                  )}
                                  {/* C badge */}
                                  {player.isCaptain && (
                                    <div style={{
                                      position: "absolute",
                                      bottom: -2,
                                      right: -4,
                                      width: 15,
                                      height: 15,
                                      borderRadius: "50%",
                                      background: "#FBBF24",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#78350f",
                                      fontSize: 8,
                                      fontWeight: 900,
                                      lineHeight: 1,
                                      border: "1.5px solid #fff",
                                      boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                                      paddingBottom: 12,
                                    }}>
                                      C
                                    </div>
                                  )}
                                </div>
                                {/* Name pill */}
                                <div style={{
                                  color: "#fff",
                                  fontSize: fontSize,
                                  fontWeight: 700,
                                  textAlign: "center",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: avatarSize + 36,
                                  lineHeight: 1.1,
                                  background: "rgba(0,0,0,0.65)",
                                  padding: "0px 5px 10px",
                                  borderRadius: 5,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}>
                                  {player.display_name.length > 12
                                    ? player.display_name.slice(0, 11) + "\u2026"
                                    : player.display_name}
                                </div>
                              </div>
                            ))}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Club invite CTA */}
        {clubName && (
          <div style={{
            margin: "0 20px 6px",
            padding: "7px 14px",
            borderRadius: 8,
            background: "rgba(163, 230, 53, 0.08)",
            border: "1px solid rgba(163, 230, 53, 0.2)",
            textAlign: "center",
          }}>
            <div style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 11,
              fontWeight: 500,
              lineHeight: 1.4,
            }}>
              Part of this group? Join{" "}
              <span style={{ color: "#a3e635", fontWeight: 700 }}>{clubName}</span>
              {" "}on{" "}
              <span style={{ color: "#a3e635", fontWeight: 700 }}>picknkick.com</span>
            </div>
          </div>
        )}

        {/* 5. Footer — action CTA */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: clubName ? "6px 20px 12px" : "10px 20px 12px",
        }}>
          <div style={{
            color: "#a3e635",
            fontSize: 12,
            fontWeight: 700,
          }}>
            Draft your own teams →
          </div>
          <div style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 11,
            fontWeight: 600,
          }}>
            picknkick.com
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
