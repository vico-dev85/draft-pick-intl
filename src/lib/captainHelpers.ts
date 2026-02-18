import type { Json } from "@/integrations/supabase/types";

/**
 * Room-like object with captain fields.
 * Works with both draft_rooms and draft_rooms_public rows.
 */
interface RoomWithCaptains {
  captain1_player_id?: string | null;
  captain2_player_id?: string | null;
  captain3_player_id?: string | null;
  captains?: Json | null;
  num_teams?: number | null;
}

/**
 * Get the number of teams for a room, defaulting to 3 for legacy rooms.
 */
export function getNumTeams(room: RoomWithCaptains | null | undefined): number {
  return room?.num_teams ?? 3;
}

/**
 * Get the player ID for a given captain number.
 * Reads from the `captains` JSONB array first (0-indexed),
 * then falls back to legacy captain1/2/3_player_id columns.
 */
export function getCaptainPlayerId(
  room: RoomWithCaptains | null | undefined,
  captainNumber: number
): string | null {
  if (!room) return null;

  // Try JSONB array first (stored as ["uuid1", "uuid2", ...])
  if (Array.isArray(room.captains) && room.captains.length >= captainNumber) {
    const id = room.captains[captainNumber - 1];
    if (typeof id === "string" && id) return id;
  }

  // Fall back to legacy columns
  switch (captainNumber) {
    case 1: return room.captain1_player_id ?? null;
    case 2: return room.captain2_player_id ?? null;
    case 3: return room.captain3_player_id ?? null;
    default: return null;
  }
}

/**
 * Find which captain number a player is (1-based), or null if not a captain.
 */
export function resolveCaptainNumber(
  room: RoomWithCaptains | null | undefined,
  playerId: string | null | undefined
): number | null {
  if (!room || !playerId) return null;

  const numTeams = getNumTeams(room);
  for (let i = 1; i <= numTeams; i++) {
    if (getCaptainPlayerId(room, i) === playerId) return i;
  }
  return null;
}

/**
 * Get all captain player IDs as an array (1-indexed captain numbers).
 * Returns array of { captainNumber, playerId }.
 */
export function getAllCaptains(
  room: RoomWithCaptains | null | undefined
): { captainNumber: number; playerId: string | null }[] {
  const numTeams = getNumTeams(room);
  return Array.from({ length: numTeams }, (_, i) => ({
    captainNumber: i + 1,
    playerId: getCaptainPlayerId(room, i + 1),
  }));
}
