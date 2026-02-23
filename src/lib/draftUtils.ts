import i18next from "i18next";

// Generate a random 4-character room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(array[i] % chars.length);
  }
  return code;
}

// Generate a random raffle order for captains
// Returns an array like [2, 3, 1] meaning captain 2 picks first, then 3, then 1
export function generateRaffleOrder(numTeams: number = 3): number[] {
  const captains = Array.from({ length: numTeams }, (_, i) => i + 1);
  // Fisher-Yates shuffle
  for (let i = captains.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [captains[i], captains[j]] = [captains[j], captains[i]];
  }
  return captains;
}

// Generate snake draft order for N captains
// Pattern with default order [1,2,3]: 1,2,3,3,2,1,1,2,3,3,2,1...
// Pattern with raffle order [2,3,1]: 2,3,1,1,3,2,2,3,1,1,3,2...
//
// Split-tail fix: when the final round is incomplete, it continues in the
// SAME direction as the previous round instead of reversing. This prevents
// the "double bottom" where one captain gets consecutive last picks.
// Example (13 picks, 2 teams [A,B]):
//   Before: A B | B A | A B | B A | A B | B A | A   → A gets picks 12 AND 13
//   After:  A B | B A | A B | B A | A B | B A | B   → split across captains
export function generateSnakeDraftOrder(totalPicks: number, raffleOrder?: number[]): number[] {
  const captainOrder = raffleOrder || [1, 2, 3];
  const numTeams = captainOrder.length;
  const order: number[] = [];

  const fullRounds = Math.floor(totalPicks / numTeams);
  const remainder = totalPicks % numTeams;

  // Generate full rounds with normal snake alternation
  for (let round = 0; round < fullRounds; round++) {
    if (round % 2 === 0) {
      for (let i = 0; i < numTeams; i++) {
        order.push(captainOrder[i]);
      }
    } else {
      for (let i = numTeams - 1; i >= 0; i--) {
        order.push(captainOrder[i]);
      }
    }
  }

  // Handle partial last round — continue same direction as previous round
  // to avoid "double bottom" where one captain gets consecutive last picks
  if (remainder > 0) {
    if (fullRounds === 0) {
      // No previous round — just use forward direction
      for (let i = 0; i < remainder; i++) {
        order.push(captainOrder[i]);
      }
    } else {
      const prevRoundWasForward = (fullRounds - 1) % 2 === 0;
      if (prevRoundWasForward) {
        // Continue forward
        for (let i = 0; i < remainder; i++) {
          order.push(captainOrder[i]);
        }
      } else {
        // Continue reverse
        for (let i = numTeams - 1; i >= numTeams - remainder; i--) {
          order.push(captainOrder[i]);
        }
      }
    }
  }

  return order;
}

// Team colors — high-contrast, instantly distinguishable jersey colors
// Index 0 = unused fallback, 1-5 = captain numbers
const BG_COLORS = ["bg-muted", "bg-blue-600", "bg-red-600", "bg-amber-600", "bg-emerald-600", "bg-pink-600"];
const TEXT_COLORS = ["text-muted-foreground", "text-blue-600", "text-red-600", "text-amber-600", "text-emerald-600", "text-pink-600"];
const BORDER_COLORS = ["border-muted", "border-blue-600", "border-red-600", "border-amber-600", "border-emerald-600", "border-pink-600"];

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
