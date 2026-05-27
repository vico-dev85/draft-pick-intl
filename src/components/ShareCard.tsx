import { forwardRef } from "react";
import { TeamSymbol } from "@/components/TeamSymbol";

const TEAM_OVERLAY: Record<number, string> = {
  1: "rgba(37, 99, 235, 0.32)",
  2: "rgba(220, 38, 38, 0.32)",
  3: "rgba(217, 119, 6, 0.32)",
  4: "rgba(22, 163, 74, 0.32)",
  5: "rgba(219, 39, 119, 0.32)",
};

const TEAM_COLORS: Record<number, string> = {
  1: "#3B82F6",
  2: "#EF4444",
  3: "#F59E0B",
  4: "#22C55E",
  5: "#EC4899",
};

const AVATAR_BG_COLORS = [
  "#6D28D9", "#2563EB", "#DC2626", "#D97706",
  "#16A34A", "#DB2777", "#0891B2", "#4F46E5",
];
function getAvatarBg(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_BG_COLORS[hash % AVATAR_BG_COLORS.length];
}

type RosterPlayer = { id: string; display_name: string; photo_url?: string | null; isCaptain?: boolean };

interface Team {
  number: number;
  /** Captain's actual name — used for the captain avatar label */
  name: string;
  /** Full team display name with animal — "John's Sharks" / "כרישי יוסי" */
  displayName?: string;
  photoUrl?: string | null;
  players: { id: string; display_name: string; photo_url?: string | null }[];
}

interface ShareCardProps {
  draftName: string;
  /** Room code — drives the deterministic per-team animal pick. */
  roomCode: string;
  teams: Team[];
  location?: string | null;
  notes?: string | null;
  isSoloDraft?: boolean;
  clubName?: string | null;
  clubLogoUrl?: string | null;
}

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
      boxShadow: "0 2px 8px rgba(0,0,0,0.55)",
      border: "3px solid rgba(255,255,255,0.94)",
      overflow: "hidden",
    }}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 28"
        fill="none"
        style={{ marginTop: Math.round(size * 0.12) }}
      >
        <circle cx="12" cy="8" r="5" fill="rgba(255,255,255,0.88)" />
        <path d="M2 26c0-5.5 4.5-10 10-10s10 4.5 10 10" fill="rgba(255,255,255,0.7)" />
      </svg>
    </div>
  );
}

/** Captain first in the roster — gets placed at the FWD center spot. */
function getRoster(
  captainName: string,
  captainPhoto: string | null | undefined,
  pickedPlayers: { id: string; display_name: string; photo_url?: string | null }[],
  isSoloDraft: boolean,
): RosterPlayer[] {
  if (isSoloDraft) return pickedPlayers.map(p => ({ ...p }));
  return [
    { id: "__captain__", display_name: captainName, photo_url: captainPhoto, isCaptain: true },
    ...pickedPlayers.map(p => ({ ...p })),
  ];
}

interface PositionedPlayer extends RosterPlayer {
  /** 0-100 from left */
  x: number;
  /** 0-100 from top — pitch has GOAL AT BOTTOM, so 0% is the center line and 100% is the goal */
  y: number;
}

/**
 * Player coordinates per roster size. Designed from user mockups using the
 * new FULL pitch (9:16 portrait, both goals visible, center circle in middle).
 *   - Team's OWN goal at BOTTOM, attacking UPWARD toward top goal
 *   - Players occupy UPPER HALF of pitch (their attacking territory)
 *   - Lower half (Y > 50%) shows opposing side, intentionally empty
 *   - No goalkeeper (5-a-side casual convention)
 *   - First position in each array = most attacking slot, captain goes there
 *   - Y: 0% = top of pitch (opposing goal), 100% = bottom (own goal)
 */
function getPositions(n: number): { x: number; y: number }[] {
  switch (n) {
    case 1:
      return [{ x: 50, y: 25 }];
    case 2:
      return [{ x: 35, y: 22 }, { x: 65, y: 22 }];
    case 3:
      return [{ x: 50, y: 16 }, { x: 32, y: 38 }, { x: 68, y: 38 }];
    case 4:
      // 1-2-1 diamond stretched across full pitch
      return [
        { x: 50, y: 15 }, // forward (captain)
        { x: 22, y: 48 }, // left mid
        { x: 78, y: 48 }, // right mid
        { x: 50, y: 82 }, // back
      ];
    case 5:
      // 2-3, both lines pushed slightly forward
      return [
        { x: 35, y: 32 }, // left fwd (captain)
        { x: 65, y: 32 }, // right fwd
        { x: 15, y: 62 }, // left back (wider)
        { x: 50, y: 62 }, // center back
        { x: 85, y: 62 }, // right back (wider)
      ];
    case 6:
      // 2-2-2 stretched
      return [
        { x: 35, y: 15 }, // left fwd (captain)
        { x: 65, y: 15 },
        { x: 30, y: 48 },
        { x: 70, y: 48 },
        { x: 30, y: 80 },
        { x: 70, y: 80 },
      ];
    case 7:
      // 2-3-2 stretched
      return [
        { x: 35, y: 14 },
        { x: 65, y: 14 },
        { x: 20, y: 48 },
        { x: 50, y: 48 },
        { x: 80, y: 48 },
        { x: 32, y: 82 },
        { x: 68, y: 82 },
      ];
    case 8:
      // 3-2-3 stretched
      return [
        { x: 28, y: 14 },
        { x: 50, y: 14 },
        { x: 72, y: 14 },
        { x: 30, y: 48 },
        { x: 70, y: 48 },
        { x: 22, y: 82 },
        { x: 50, y: 82 },
        { x: 78, y: 82 },
      ];
    default:
      // Fallback for 9+: 3 rows in upper half
      return Array.from({ length: n }, (_, i) => {
        const row = Math.floor(i / 3);
        const colInRow = i % 3;
        const colsThisRow = Math.min(3, n - row * 3);
        const xStart = 50 - (colsThisRow - 1) * 25;
        return {
          x: xStart + colInRow * 50 / Math.max(1, colsThisRow - 1 || 1),
          y: 14 + row * 16,
        };
      });
  }
}

/** Captain (roster[0]) takes the first position — the most attacking slot. */
function positionPlayers(roster: RosterPlayer[]): PositionedPlayer[] {
  const coords = getPositions(roster.length);
  return roster.map((p, i) => ({ ...p, x: coords[i].x, y: coords[i].y }));
}

/**
 * 1080×1350 portrait. Three portrait pitches side-by-side at proper 3:4 aspect.
 * Players placed in realistic GK/DEF/MID/FWD layers.
 */
function getLayout(numTeams: number, hasClub: boolean) {
  const cardWidth = 1080;
  const cardHeight = 1080;
  const headerHeight = 72;
  const draftNameBlock = 80;
  // Symbol block replaces the old text-only "Team Name" banner.
  // Bigger so the TeamSymbol logo + embedded text zone are legible.
  const symbolSize =
    numTeams <= 2 ? 200 :
    numTeams === 3 ? 160 :
    numTeams === 4 ? 120 :
    100;
  const symbolBlock = symbolSize + 8; // symbol + small gap below
  const footerBlock = 54;
  const clubCTABlock = hasClub ? 52 + 10 : 0;
  const bodyPaddingX = 24;
  const teamGap = 18;

  // Pitch is 9:16 portrait. Bound by width allocation OR available vertical
  // space — pick the smaller.
  const innerWidth = cardWidth - 2 * bodyPaddingX;
  const pitchByWidth = Math.floor((innerWidth - teamGap * (numTeams - 1)) / numTeams);
  const availableHeight = cardHeight - headerHeight - 4 - draftNameBlock - symbolBlock - footerBlock - clubCTABlock - 32;
  const pitchByHeightWidth = Math.floor(availableHeight * 9 / 16);
  const pitchWidth = Math.min(pitchByWidth, pitchByHeightWidth);
  const pitchHeight = Math.floor(pitchWidth * 16 / 9);

  // Avatar size scaled to pitch — kept compact so the formation has room to breathe
  const avatarSize =
    numTeams <= 2 ? Math.floor(pitchWidth * 0.17) :
    numTeams === 3 ? Math.floor(pitchWidth * 0.18) :
    Math.floor(pitchWidth * 0.20);

  const nameFontSize =
    numTeams <= 2 ? 23 :
    numTeams === 3 ? 20 :
    numTeams === 4 ? 15 :
    13;

  const teamHeaderSize =
    numTeams <= 2 ? 24 :
    numTeams === 3 ? 20 :
    16;

  return {
    cardWidth, cardHeight, headerHeight, draftNameBlock,
    symbolSize, symbolBlock, footerBlock, clubCTABlock,
    bodyPaddingX, pitchWidth, pitchHeight, teamGap,
    avatarSize, nameFontSize, teamHeaderSize,
  };
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ draftName, roomCode, teams, location, isSoloDraft, clubName, clubLogoUrl }, ref) => {
    const numTeams = teams.length;
    const L = getLayout(numTeams, !!clubName);

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: L.cardWidth,
          height: L.cardHeight,
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
          height: L.headerHeight,
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
                  }}>
                    {clubName}
                  </div>
                )}
              </>
            )}
          </div>
          {location && (
            <div style={{ color: "rgba(0,0,0,0.55)", fontSize: 15, fontWeight: 600 }}>
              {location}
            </div>
          )}
        </div>

        {/* Purple accent line */}
        <div style={{
          height: 4,
          background: "linear-gradient(90deg, #7C3AED, #a855f7, #7C3AED)",
          flexShrink: 0,
        }} />

        {/* Body */}
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
            background: "linear-gradient(180deg, rgba(10,10,26,0.58) 0%, rgba(10,10,26,0.78) 50%, rgba(10,10,26,0.65) 100%)",
          }} />

          <div style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: `16px ${L.bodyPaddingX}px 16px`,
            boxSizing: "border-box",
          }}>
            {/* Draft name + club logo */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              marginBottom: 56,
              flexShrink: 0,
            }}>
              {clubLogoUrl && (
                <img
                  src={clubLogoUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    objectFit: "cover",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
                    border: "2px solid rgba(255,255,255,0.2)",
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{
                color: "#fff",
                fontSize: 44,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                textShadow: "0 2px 20px rgba(0,0,0,0.7)",
                lineHeight: 1.05,
                textAlign: "center",
              }}>
                {draftName}
              </div>
            </div>

            {/* Pitches row */}
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: L.teamGap,
              flexShrink: 0,
            }}>
              {teams.map((team) => {
                const teamColor = TEAM_COLORS[team.number] || TEAM_COLORS[1];
                const overlay = TEAM_OVERLAY[team.number] || TEAM_OVERLAY[1];
                const roster = getRoster(team.name, team.photoUrl, team.players, !!isSoloDraft);
                const positioned = positionPlayers(roster);

                return (
                  <div key={team.number} style={{ width: L.pitchWidth, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {/* Team symbol — logo with team name in the dedicated text zone */}
                    <div style={{
                      width: "100%",
                      height: L.symbolBlock,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <TeamSymbol
                        roomCode={roomCode}
                        teamNumber={team.number}
                        captainName={team.name}
                        displayNameOverride={team.displayName}
                        size={L.symbolSize}
                        variant="with-name"
                        forCanvas
                      />
                    </div>

                    {/* Pitch (proper 3:4) */}
                    <div style={{
                      position: "relative",
                      width: L.pitchWidth,
                      height: L.pitchHeight,
                      borderRadius: 14,
                      overflow: "hidden",
                      border: `3px solid ${teamColor}`,
                      boxShadow: `0 8px 28px ${teamColor}55`,
                    }}>
                      <img
                        src="/assets/bg/pitch-full.png"
                        alt=""
                        crossOrigin="anonymous"
                        style={{
                          position: "absolute",
                          top: 0, left: 0,
                          width: "100%", height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: overlay }} />
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.18)" }} />

                      {/* Players in positioned layers */}
                      {positioned.map((player) => (
                        <div
                          key={player.id}
                          style={{
                            position: "absolute",
                            left: `${player.x}%`,
                            top: `${player.y}%`,
                            transform: "translate(-50%, -50%)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0,
                            width: L.avatarSize + 36,
                          }}
                        >
                          <div style={{ position: "relative" }}>
                            {player.photo_url ? (
                              <img
                                src={player.photo_url}
                                alt=""
                                crossOrigin="anonymous"
                                style={{
                                  width: L.avatarSize,
                                  height: L.avatarSize,
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  boxShadow: "0 3px 12px rgba(0,0,0,0.65)",
                                  border: "3px solid rgba(255,255,255,0.95)",
                                }}
                              />
                            ) : (
                              <SilhouetteAvatar
                                size={L.avatarSize}
                                bgColor={getAvatarBg(player.display_name)}
                              />
                            )}
                            {player.isCaptain && (
                              <div style={{
                                position: "absolute",
                                bottom: -3,
                                right: -5,
                                width: Math.round(L.avatarSize * 0.34),
                                height: Math.round(L.avatarSize * 0.34),
                                borderRadius: "50%",
                                background: "#FBBF24",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#78350f",
                                fontSize: Math.round(L.avatarSize * 0.22),
                                fontWeight: 900,
                                lineHeight: 1,
                                border: "2px solid #fff",
                                boxShadow: "0 1px 5px rgba(0,0,0,0.6)",
                                paddingBottom: Math.round(L.avatarSize * 0.14),
                              }}>
                                C
                              </div>
                            )}
                          </div>
                          <div style={{
                            color: "#fff",
                            fontFamily: "'Rubik', 'Inter', system-ui, sans-serif",
                            fontSize: L.nameFontSize,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            textAlign: "center",
                            marginTop: -2,
                            whiteSpace: "nowrap",
                            overflow: "visible",
                            maxWidth: L.avatarSize + 80,
                            lineHeight: 1.1,
                          }}>
                            {player.display_name.length > 12
                              ? player.display_name.slice(0, 11) + "…"
                              : player.display_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Spacer pushes club CTA + footer to bottom */}
            <div style={{ flex: 1, minHeight: 16 }} />

            {/* Footer — subtle brand mark only */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              paddingTop: 10,
            }}>
              <div style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 15,
                fontWeight: 700,
              }}>
                picknkick.com
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
