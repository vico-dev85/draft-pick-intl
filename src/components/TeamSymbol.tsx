import { useEffect, useState } from "react";
import { getTeamAnimal, getTeamDisplayName } from "@/lib/captainHelpers";
import { getTeamSymbolIconUrl } from "@/lib/teamSymbols";
import { composeTeamSymbol, getCachedTeamSymbol } from "@/lib/composeTeamSymbol";

interface TeamSymbolProps {
  roomCode: string | null | undefined;
  teamNumber: number;
  captainName?: string | null;
  /** Square pixel size — width AND height. */
  size: number;
  /**
   * Layout variant:
   *   - "with-name": logo + team name baked into the ribbon  (cards/hero)
   *   - "logo-only": just the symbol, no text                 (inline)
   *   - "badge":     circle-cropped symbol, no text           (tiny badges)
   */
  variant?: "with-name" | "logo-only" | "badge";
  /** Override the auto-generated display name. */
  displayNameOverride?: string;
  className?: string;
  /** Marks the <img> for html2canvas capture (sets crossOrigin). */
  forCanvas?: boolean;
}

/**
 * Renders a team's animal logo with their team name baked directly into the
 * ribbon (for "with-name" variant). Composition runs once per
 * (animal, name) pair on a hidden canvas, then the result is used as a
 * regular <img> — identical rendering on the live page and in html2canvas.
 */
export function TeamSymbol({
  roomCode,
  teamNumber,
  captainName,
  size,
  variant = "with-name",
  displayNameOverride,
  className = "",
  forCanvas = false,
}: TeamSymbolProps) {
  const animal = getTeamAnimal(roomCode, teamNumber);
  const displayName =
    displayNameOverride ?? getTeamDisplayName(roomCode, teamNumber, captainName);
  const showName = variant === "with-name";
  const isCircle = variant === "badge";

  // For "with-name" we render the composed (logo+text) image. For other
  // variants we use the raw logo URL directly — no composition needed.
  const composeKey = showName
    ? { animalKey: animal.key, displayName }
    : null;

  const [composedUrl, setComposedUrl] = useState<string | null>(
    composeKey ? getCachedTeamSymbol(composeKey) : null,
  );

  useEffect(() => {
    if (!composeKey) {
      setComposedUrl(null);
      return;
    }
    let cancelled = false;
    composeTeamSymbol(composeKey)
      .then((url) => { if (!cancelled) setComposedUrl(url); })
      .catch(() => { /* fall back to placeholder */ });
    return () => { cancelled = true; };
    // composeKey is freshly built each render but its content drives equality
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeKey?.animalKey, composeKey?.displayName]);

  // For variants without text we use the compact "icon" asset (no ribbon),
  // which crops tight on the silhouette and looks better at small sizes.
  const symbolUrl = composedUrl ?? (showName ? null : getTeamSymbolIconUrl(animal.key));

  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "missing">(
    composedUrl ? "loaded" : "loading",
  );

  // Reset img loading state whenever the source changes
  useEffect(() => {
    setImgStatus(composedUrl ? "loaded" : "loading");
  }, [composedUrl]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: isCircle ? "50%" : 0,
        overflow: isCircle ? "hidden" : "visible",
      }}
    >
      {/* Subtle loading spinner shown while the logo / composed image loads. */}
      {(imgStatus !== "loaded" || !symbolUrl) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="animate-spin"
            style={{
              width: Math.max(14, size * 0.2),
              height: Math.max(14, size * 0.2),
              border: `${Math.max(1.5, size * 0.022)}px solid rgba(255,255,255,0.12)`,
              borderTopColor: "rgba(255,255,255,0.55)",
              borderRadius: "50%",
            }}
          />
        </div>
      )}

      {symbolUrl && (
        <img
          src={symbolUrl}
          alt=""
          crossOrigin={forCanvas ? "anonymous" : undefined}
          onLoad={() => setImgStatus("loaded")}
          onError={() => setImgStatus("missing")}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: imgStatus === "loaded" ? 1 : 0,
            transition: "opacity 150ms",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
