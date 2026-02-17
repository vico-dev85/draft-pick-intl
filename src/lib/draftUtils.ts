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
export function generateRaffleOrder(): number[] {
  const captains = [1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = captains.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [captains[i], captains[j]] = [captains[j], captains[i]];
  }
  return captains;
}

// Generate snake draft order for 3 captains
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

// Get captain color class
export function getCaptainColor(captainNumber: number): string {
  switch (captainNumber) {
    case 1:
      return "bg-primary";
    case 2:
      return "bg-secondary";
    case 3:
      return "bg-accent";
    default:
      return "bg-muted";
  }
}

// Get captain text color class
export function getCaptainTextColor(captainNumber: number): string {
  switch (captainNumber) {
    case 1:
      return "text-primary";
    case 2:
      return "text-secondary";
    case 3:
      return "text-accent";
    default:
      return "text-muted-foreground";
  }
}

// Get captain border color class
export function getCaptainBorderColor(captainNumber: number): string {
  switch (captainNumber) {
    case 1:
      return "border-primary";
    case 2:
      return "border-secondary";
    case 3:
      return "border-accent";
    default:
      return "border-muted";
  }
}

// Get captain label
export function getCaptainLabel(captainNumber: number): string {
  switch (captainNumber) {
    case 1:
      return "קפטן 1";
    case 2:
      return "קפטן 2";
    case 3:
      return "קפטן 3";
    default:
      return "קפטן";
  }
}

// Re-export session management from secure session manager
// This provides backward compatibility while using the more secure implementation
export { getSecureSessionId, getSessionIdSync, clearSession } from "./sessionManager";

// Backward compatibility alias - prefer getSecureSessionId() for async contexts
// or getSessionIdSync() when async is not possible
export { getSessionIdSync as getSessionId } from "./sessionManager";
