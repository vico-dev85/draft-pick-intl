/**
 * Theatrical Raffle Script Generator
 *
 * Generates a predetermined script of "odd-one-out" palm rounds
 * that converges to the already-determined final order.
 *
 * The animation is theatrical - the outcome is fixed, but the
 * rounds make it feel like a real game.
 */

export type HandDirection = 'up' | 'down';

export interface PalmRound {
  // Hand directions for each position: [top, bottom-left, bottom-right]
  hands: [HandDirection, HandDirection, HandDirection];
  // Captain number who is the odd-one-out (wins), or null if reroll
  winner: number | null;
  // True if this round is a reroll (all same, or neutral is odd in stage 2)
  isReroll: boolean;
  // For stage 2: which position is neutral (0, 1, or 2), or null for stage 1
  neutralPosition: number | null;
}

export interface RaffleScript {
  // Final order: [1st place captain, 2nd place captain, 3rd place captain]
  finalOrder: [number, number, number];
  // Rounds to determine 1st place (all 3 real captains)
  stage1: PalmRound[];
  // Rounds to determine 2nd place (2 real captains + 1 neutral)
  stage2: PalmRound[];
  // Captain positions: which captain is at which position
  // [top captain#, bottom-left captain#, bottom-right captain#]
  positions: [number, number, number];
}

/**
 * Get the position index (0, 1, 2) for a captain number (1, 2, 3)
 */
function getCaptainPosition(captain: number, positions: [number, number, number]): number {
  return positions.indexOf(captain);
}

/**
 * Generate a round where a specific captain is the odd-one-out
 */
function generateWinningRound(
  winner: number,
  positions: [number, number, number],
  neutralPosition: number | null = null
): PalmRound {
  const winnerPos = getCaptainPosition(winner, positions);

  // Randomly choose what the "majority" hand will be
  const majorityHand: HandDirection = Math.random() > 0.5 ? 'up' : 'down';
  const oddHand: HandDirection = majorityHand === 'up' ? 'down' : 'up';

  // All positions get majority hand, except winner gets odd hand
  const hands: [HandDirection, HandDirection, HandDirection] = [
    majorityHand,
    majorityHand,
    majorityHand,
  ];
  hands[winnerPos] = oddHand;

  return {
    hands,
    winner,
    isReroll: false,
    neutralPosition,
  };
}

/**
 * Generate a reroll round (all same hands)
 */
function generateRerollRound(neutralPosition: number | null = null): PalmRound {
  const sameHand: HandDirection = Math.random() > 0.5 ? 'up' : 'down';

  return {
    hands: [sameHand, sameHand, sameHand],
    winner: null,
    isReroll: true,
    neutralPosition,
  };
}

/**
 * Generate a reroll round where neutral is the odd-one-out (stage 2 only)
 */
function generateNeutralOddRound(neutralPosition: number): PalmRound {
  const majorityHand: HandDirection = Math.random() > 0.5 ? 'up' : 'down';
  const oddHand: HandDirection = majorityHand === 'up' ? 'down' : 'up';

  const hands: [HandDirection, HandDirection, HandDirection] = [
    majorityHand,
    majorityHand,
    majorityHand,
  ];
  hands[neutralPosition] = oddHand;

  return {
    hands,
    winner: null, // Neutral can't win
    isReroll: true,
    neutralPosition,
  };
}

/**
 * Generate stage 1 rounds (determining 1st place among 3 captains)
 */
function generateStage1Rounds(
  firstPlace: number,
  positions: [number, number, number]
): PalmRound[] {
  const rounds: PalmRound[] = [];

  // Add 0-2 reroll rounds for drama (random)
  const numRerolls = Math.floor(Math.random() * 2); // 0 or 1
  for (let i = 0; i < numRerolls; i++) {
    rounds.push(generateRerollRound(null));
  }

  // Final round: first place captain wins
  rounds.push(generateWinningRound(firstPlace, positions, null));

  return rounds;
}

/**
 * Generate stage 2 rounds (determining 2nd place among 2 captains + neutral)
 */
function generateStage2Rounds(
  secondPlace: number,
  firstPlace: number,
  positions: [number, number, number]
): PalmRound[] {
  const rounds: PalmRound[] = [];

  // Neutral takes the position of the first place winner
  const neutralPosition = getCaptainPosition(firstPlace, positions);

  // Add 0-2 reroll rounds for drama
  const numRerolls = Math.floor(Math.random() * 2); // 0 or 1
  for (let i = 0; i < numRerolls; i++) {
    // Randomly choose between "all same" or "neutral is odd"
    if (Math.random() > 0.5) {
      rounds.push(generateRerollRound(neutralPosition));
    } else {
      rounds.push(generateNeutralOddRound(neutralPosition));
    }
  }

  // Final round: second place captain wins
  rounds.push(generateWinningRound(secondPlace, positions, neutralPosition));

  return rounds;
}

/**
 * Generate a complete theatrical script for the raffle
 *
 * @param finalOrder - The predetermined final order [1st, 2nd, 3rd]
 * @returns A complete script with all rounds
 */
export function generateTheatricalScript(
  finalOrder: [number, number, number]
): RaffleScript {
  const [firstPlace, secondPlace, thirdPlace] = finalOrder;

  // Fixed positions: Captain 1 at top, Captain 2 at bottom-left, Captain 3 at bottom-right
  const positions: [number, number, number] = [1, 2, 3];

  // Generate rounds for each stage
  const stage1 = generateStage1Rounds(firstPlace, positions);
  const stage2 = generateStage2Rounds(secondPlace, firstPlace, positions);

  return {
    finalOrder,
    stage1,
    stage2,
    positions,
  };
}

/**
 * Find the odd-one-out in a set of 3 hands
 * Returns the index (0, 1, 2) of the odd hand, or -1 if all same
 */
export function findOddOneOut(hands: [HandDirection, HandDirection, HandDirection]): number {
  const [a, b, c] = hands;

  if (a === b && b === c) {
    return -1; // All same
  }

  if (a === b) return 2; // c is odd
  if (a === c) return 1; // b is odd
  return 0; // a is odd
}

/**
 * Get display text for rank
 */
export function getRankLabel(rank: number): string {
  switch (rank) {
    case 1: return '1st';
    case 2: return '2nd';
    case 3: return '3rd';
    default: return '';
  }
}

