import i18next from "i18next";

// Generate a random 4-character room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a random raffle order for captains
// Returns an array like [2, 3, 1] meaning captain 2 picks first, then 3, then 1
export function generateRaffleOrder(numTeams: number = 3): number[] {
  const captains = Array.from({ length: numTeams }, (_, i) => i + 1);
  // Fisher-Yates shuffle
  for (let i = captains.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [captains[i], captains[j]] = [captains[j], captains[i]];
  }
  return captains;
}

// Generate snake draft order for N captains
// Pattern with default order [1,2,3]: 1,2,3,3,2,1,1,2,3,3,2,1...
// Pattern with raffle order [2,3,1]: 2,3,1,1,3,2,2,3,1,1,3,2...
export function generateSnakeDraftOrder(totalPicks: number, raffleOrder?: number[]): number[] {
  const captainOrder = raffleOrder || [1, 2, 3];
  const order: number[] = [];
  let round = 0;

  while (order.length < totalPicks) {
    const isEvenRound = round % 2 === 0;
    if (isEvenRound) {
      // Forward order
      for (let i = 0; i < captainOrder.length && order.length < totalPicks; i++) {
        order.push(captainOrder[i]);
      }
    } else {
      // Reverse order
      for (let i = captainOrder.length - 1; i >= 0 && order.length < totalPicks; i--) {
        order.push(captainOrder[i]);
      }
    }
    round++;
  }

  return order;
}

// Color arrays indexed by captain number (1-based, index 0 is unused fallback)
const BG_COLORS = ["bg-muted", "bg-primary", "bg-secondary", "bg-accent", "bg-orange-600", "bg-pink-600"];
const TEXT_COLORS = ["text-muted-foreground", "text-primary", "text-secondary", "text-accent", "text-orange-600", "text-pink-600"];
const BORDER_COLORS = ["border-muted", "border-primary", "border-secondary", "border-accent", "border-orange-600", "border-pink-600"];

// Get captain color class
export function getCaptainColor(captainNumber: number): string {
  return BG_COLORS[captainNumber] ?? BG_COLORS[0];
}

// Get captain text color class
export function getCaptainTextColor(captainNumber: number): string {
  return TEXT_COLORS[captainNumber] ?? TEXT_COLORS[0];
}

// Get captain border color class
export function getCaptainBorderColor(captainNumber: number): string {
  return BORDER_COLORS[captainNumber] ?? BORDER_COLORS[0];
}

// Get team configuration based on number of teams
export function getTeamConfig(numTeams: number): { minPlayers: number; maxPlayers: number } {
  switch (numTeams) {
    case 2: return { minPlayers: 6, maxPlayers: 30 };
    case 3: return { minPlayers: 9, maxPlayers: 30 };
    case 4: return { minPlayers: 12, maxPlayers: 40 };
    case 5: return { minPlayers: 15, maxPlayers: 50 };
    default: return { minPlayers: numTeams * 3, maxPlayers: numTeams * 10 };
  }
}

// Get grid columns class for N teams
export function getTeamGridClass(numTeams: number): string {
  switch (numTeams) {
    case 2: return "grid-cols-2";
    case 3: return "grid-cols-3";
    case 4: return "grid-cols-4";
    case 5: return "grid-cols-5";
    default: return "grid-cols-3";
  }
}

// Get captain label — uses i18n when available, falls back to English
export function getCaptainLabel(captainNumber: number): string {
  if (i18next.isInitialized) {
    return i18next.t("draft:captain", { number: captainNumber, defaultValue: `Captain ${captainNumber}` });
  }
  return `Captain ${captainNumber}`;
}

// Re-export session management from secure session manager
// This provides backward compatibility while using the more secure implementation
export { getSecureSessionId, getSessionIdSync, clearSession } from "./sessionManager";

// Backward compatibility alias - prefer getSecureSessionId() for async contexts
// or getSessionIdSync() when async is not possible
export { getSessionIdSync as getSessionId } from "./sessionManager";
