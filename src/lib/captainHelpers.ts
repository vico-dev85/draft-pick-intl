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

// ──────────────────────────────────────────────────────────────────────
// Team naming — "John's Sharks" / "כרישי יוסי"
// ──────────────────────────────────────────────────────────────────────

export type AnimalKey =
  | "fox" | "rooster" | "chick"
  | "fish" | "turtle" | "rabbit";

export interface AnimalName {
  /** Stable slug — matches the WebP file name in /public/assets/teams/ */
  key: AnimalKey;
  /** Plural English, e.g. "Foxes" */
  en: string;
  /** Hebrew construct form (smichut), e.g. "שועלי" meaning "foxes of" */
  he: string;
}

/** Color families. Algorithm picks across families per draft → guaranteed contrast. */
export type AnimalFamily = "warm" | "cool";

/** Pool of animal team names with family grouping. */
export const TEAM_ANIMALS: Record<AnimalKey, AnimalName & { family: AnimalFamily }> = {
  fox:     { key: "fox",     en: "Foxes",    he: "שועלי",   family: "warm" },
  rooster: { key: "rooster", en: "Roosters", he: "תרנגולי", family: "warm" },
  chick:   { key: "chick",   en: "Chicks",   he: "אפרוחי",  family: "warm" },
  fish:    { key: "fish",    en: "Fish",     he: "דגי",     family: "cool" },
  turtle:  { key: "turtle",  en: "Turtles",  he: "צבי",     family: "cool" },
  rabbit:  { key: "rabbit",  en: "Rabbits",  he: "ארנבי",   family: "cool" },
};

const FAMILY_ORDER: AnimalFamily[] = ["warm", "cool"];

const ANIMALS_BY_FAMILY: Record<AnimalFamily, AnimalKey[]> = {
  warm: ["fox", "rooster", "chick"],
  cool: ["fish", "turtle", "rabbit"],
};

/** True if the string contains any Hebrew character (U+0590 to U+05FF). */
function hasHebrew(text: string): boolean {
  return /[֐-׿]/.test(text);
}

/** Deterministic 32-bit hash of a string (FNV-1a). */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Family-aware deterministic animal assignment for all teams in a room.
 *
 * Each team gets an animal from a rotating family (Cool → Warm → Earth → Cool ...),
 * so a 3-team room always has one animal from each family — guaranteed visual
 * contrast. Within a family, the specific animal is picked by hash and never
 * collides with another team in the same room (we track `used`).
 */
function pickAnimalsForRoom(roomCode: string, numTeams: number): AnimalKey[] {
  const seed = hash32(roomCode.toUpperCase());
  const familyStart = seed % FAMILY_ORDER.length;
  const used = new Set<AnimalKey>();
  const result: AnimalKey[] = [];

  for (let teamNum = 1; teamNum <= numTeams; teamNum++) {
    const family = FAMILY_ORDER[(familyStart + teamNum - 1) % FAMILY_ORDER.length];
    const familyAnimals = ANIMALS_BY_FAMILY[family];
    const animalSeed = hash32(`${roomCode.toUpperCase()}#${teamNum}#${family}`);

    // Try each animal in this family, rotated by the per-team seed; pick first unused.
    let chosen: AnimalKey | undefined;
    for (let offset = 0; offset < familyAnimals.length; offset++) {
      const candidate = familyAnimals[(animalSeed + offset) % familyAnimals.length];
      if (!used.has(candidate)) {
        chosen = candidate;
        break;
      }
    }
    // Fallback (only triggers if numTeams > 9, which shouldn't happen).
    chosen = chosen ?? familyAnimals[0];

    used.add(chosen);
    result.push(chosen);
  }

  return result;
}

/** Pick the animal for a specific team. Deterministic from room code + team number. */
export function getTeamAnimalKey(
  roomCode: string | null | undefined,
  teamNumber: number,
): AnimalKey {
  if (!roomCode) return "fox";
  // Compute up to teamNumber to ensure uniqueness across the room.
  const animals = pickAnimalsForRoom(roomCode, Math.max(teamNumber, 1));
  return animals[teamNumber - 1] ?? "fox";
}

/** Get the full animal record (en, he, family) for a team. */
export function getTeamAnimal(
  roomCode: string | null | undefined,
  teamNumber: number,
): AnimalName & { family: AnimalFamily } {
  return TEAM_ANIMALS[getTeamAnimalKey(roomCode, teamNumber)];
}

function pickAnimalForTeam(roomCode: string, teamNumber: number): AnimalName {
  return getTeamAnimal(roomCode, teamNumber);
}

/**
 * Render the team's display name.
 *   - Hebrew captain: "{animal_construct} {name}"  → "כרישי יוסי"
 *   - Anything else:  "{name}'s {Animal}"          → "John's Sharks"
 *   - No captain name (e.g. solo draft, no override): bare animal in detected
 *     language → "Sharks" or "כרישים"
 */
export function getTeamDisplayName(
  roomCode: string | null | undefined,
  teamNumber: number,
  captainName: string | null | undefined,
): string {
  if (!roomCode) return `Team ${teamNumber}`;

  const animal = pickAnimalForTeam(roomCode, teamNumber);
  const trimmed = (captainName ?? "").trim();

  if (!trimmed) {
    // Bare animal — pick language from the room code (which is English)
    // so fallback is always "Sharks" not "כרישים". Hebrew-only owners can
    // still set a captain to get the Hebrew form.
    return animal.en;
  }

  if (hasHebrew(trimmed)) {
    return `${animal.he} ${trimmed}`;
  }
  return `${trimmed}'s ${animal.en}`;
}
