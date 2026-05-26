import type { AnimalFamily, AnimalKey } from "./captainHelpers";
import { getTeamAnimal } from "./captainHelpers";

/**
 * Where to render the team name on top of each animal logo.
 * Bottom 28% horizontal band — all 9 logos reserve this same zone.
 *   - yPct: top edge of the text zone as a fraction of logo height
 *   - heightPct: height of the zone
 *   - paddingPct: horizontal padding inside the zone (left+right margin)
 */
/**
 * Where to render the team name on top of each animal logo.
 * Tuned to the shield+ribbon icon set: the ribbon's flat horizontal middle
 * sits roughly Y=82-92% of the 1024 canvas, narrower than the full width.
 */
export const TEXT_ZONE = {
  // Native-browser default. Live Results page uses this and renders correctly.
  yPct: 0.65,
  heightPct: 0.22,
  // Ribbon's flat horizontal area (excluding the curved 3D-fold tails)
  // spans ~X=150-875 of 1024 → 15% padding each side.
  paddingPct: 0.15,
  /**
   * html2canvas renders flex-centered text slightly BELOW the native browser
   * at the same yPct (different font baseline computation). Apply this
   * compensation ONLY when rendering for canvas capture (forCanvas=true).
   * Negative = shift text up.
   */
  canvasYOffset: -0.05,
  /** Text color when drawn on top of a real logo asset (white ribbon → dark text). */
  textColor: "#0F172A",
} as const;

/** URL of the animal logo WebP. Returns the public path — the file may or may not exist yet. */
export function getTeamSymbolUrl(animalKey: AnimalKey): string {
  return `/assets/teams/${animalKey}.webp`;
}

/**
 * Compact icon variant (no ribbon, cropped tight on the shield).
 * Use for small/inline contexts: badges, scoreboard tiles, standings rows.
 */
export function getTeamSymbolIconUrl(animalKey: AnimalKey): string {
  return `/assets/teams/${animalKey}-icon.webp`;
}

/** Convenience: resolve directly from room code + team number. */
export function getTeamSymbolUrlForRoom(
  roomCode: string | null | undefined,
  teamNumber: number,
): string {
  return getTeamSymbolUrl(getTeamAnimal(roomCode, teamNumber).key);
}

/**
 * Color tokens for the family-based placeholder fallback. When the real logo
 * PNG isn't on disk yet, we render a solid circle in the animal's family
 * color with the animal's first English letter inside.
 *
 * Once real logos exist, these colors stop appearing in the UI — but they
 * also serve as a "design hint" for what color each family's logos should
 * lean toward, keeping the design system coherent.
 */
export const FAMILY_COLORS: Record<AnimalFamily, { bg: string; fg: string }> = {
  warm: { bg: "#B45309", fg: "#FEF3C7" }, // burnt amber, cream
  cool: { bg: "#1E40AF", fg: "#E0F2FE" }, // deep blue, ice white
};
