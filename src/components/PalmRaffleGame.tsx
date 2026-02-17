/**
 * Palm Raffle Game Component
 *
 * Visualizes the "odd-one-out palms" raffle using a theatrical script.
 * All clients receive the same script and play through it synchronously.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RaffleScript, PalmRound, HandDirection } from '@/lib/raffleScript';
import { getRankLabelHebrew } from '@/lib/raffleScript';
import { getCaptainColor } from '@/lib/draftUtils';

// Asset paths - relative to public folder
const ASSETS_PATH = '/assets/hands';

// All available hand images for the shuffle animation
const ALL_HAND_IMAGES = [
  `${ASSETS_PATH}/hand_up_top.png`,
  `${ASSETS_PATH}/hand_down_top.png`,
  `${ASSETS_PATH}/hand_up_left.png`,
  `${ASSETS_PATH}/hand_down_left.png`,
  `${ASSETS_PATH}/hand_up_right.png`,
  `${ASSETS_PATH}/hand_down_right.png`,
];

const getHandAsset = (direction: HandDirection | 'ready', position: 'top' | 'left' | 'right'): string => {
  if (direction === 'ready') {
    return `${ASSETS_PATH}/hand_ready.png`;
  }
  return `${ASSETS_PATH}/hand_${direction}_${position}.png`;
};

const getRandomHandImage = (): string => {
  return ALL_HAND_IMAGES[Math.floor(Math.random() * ALL_HAND_IMAGES.length)];
};

interface PalmRaffleGameProps {
  script: RaffleScript;
  captainNames: Record<number, string>;
  onComplete: () => void;
}

type GamePhase = 'countdown' | 'ready' | 'reveal' | 'resolve' | 'transition' | 'complete';

interface GameState {
  phase: GamePhase;
  stage: 1 | 2;
  roundIndex: number;
  countdown: number;
  firstPlaceWinner: number | null;
  showHelper: boolean;
  rerollMessage: string | null;
}

// Position configs for the 3 tiles
const POSITIONS = {
  top: { position: 'top' as const, className: 'top-0 left-1/2 -translate-x-1/2' },
  bottomLeft: { position: 'left' as const, className: 'bottom-0 left-4 sm:left-8' },
  bottomRight: { position: 'right' as const, className: 'bottom-0 right-4 sm:right-8' },
};

export function PalmRaffleGame({ script, captainNames, onComplete }: PalmRaffleGameProps) {
  const [state, setState] = useState<GameState>({
    phase: 'countdown',
    stage: 1,
    roundIndex: 0,
    countdown: 3,
    firstPlaceWinner: null,
    showHelper: true,
    rerollMessage: null,
  });

  // For the rapid hand shuffle animation during countdown
  const [shuffleHands, setShuffleHands] = useState<[string, string, string]>([
    getRandomHandImage(),
    getRandomHandImage(),
    getRandomHandImage(),
  ]);

  const isMountedRef = useRef(true);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Rapid hand shuffle effect during countdown
  useEffect(() => {
    if (state.phase !== 'countdown') return;

    const interval = setInterval(() => {
      setShuffleHands([
        getRandomHandImage(),
        getRandomHandImage(),
        getRandomHandImage(),
      ]);
    }, 100); // Change every 100ms for rapid effect

    return () => clearInterval(interval);
  }, [state.phase]);

  // Main game loop
  useEffect(() => {
    if (!isMountedRef.current) return;

    const runPhase = async () => {
      switch (state.phase) {
        case 'countdown':
          if (state.countdown > 0) {
            await sleep(700);
            if (!isMountedRef.current) return;
            setState(s => ({ ...s, countdown: s.countdown - 1 }));
          } else {
            setState(s => ({ ...s, phase: 'ready' }));
          }
          break;

        case 'ready':
          // Ready phase: 2 seconds of wiggling
          await sleep(2000);
          if (!isMountedRef.current) return;
          setState(s => ({ ...s, phase: 'reveal', showHelper: false }));
          break;

        case 'reveal':
          // Instant reveal, then wait 1 second
          await sleep(1000);
          if (!isMountedRef.current) return;
          setState(s => ({ ...s, phase: 'resolve' }));
          break;

        case 'resolve':
          // Check result of current round
          const currentRounds = state.stage === 1 ? script.stage1 : script.stage2;
          const currentRound = currentRounds[state.roundIndex];

          if (currentRound.isReroll) {
            // Show reroll message
            const message = currentRound.neutralPosition !== null && currentRound.winner === null
              ? 'יד ניטרלית שונה — שוב!'
              : 'כולם אותו דבר — שוב!';
            setState(s => ({ ...s, rerollMessage: message }));
            await sleep(1500);
            if (!isMountedRef.current) return;
            setState(s => ({
              ...s,
              rerollMessage: null,
              roundIndex: s.roundIndex + 1,
              phase: 'ready',
            }));
          } else {
            // We have a winner!
            await sleep(2000); // Let user see the highlight
            if (!isMountedRef.current) return;

            if (state.stage === 1) {
              // Move to stage 2
              setState(s => ({
                ...s,
                firstPlaceWinner: currentRound.winner,
                stage: 2,
                roundIndex: 0,
                phase: 'transition',
              }));
            } else {
              // Game complete
              setState(s => ({ ...s, phase: 'complete' }));
            }
          }
          break;

        case 'transition':
          // Brief pause between stages
          await sleep(1500);
          if (!isMountedRef.current) return;
          setState(s => ({ ...s, phase: 'ready' }));
          break;

        case 'complete':
          await sleep(1000);
          if (!isMountedRef.current) return;
          onComplete();
          break;
      }
    };

    runPhase();
  }, [state.phase, state.countdown, state.roundIndex, state.stage, script, onComplete]);

  // Get current round data
  const getCurrentRound = (): PalmRound | null => {
    const rounds = state.stage === 1 ? script.stage1 : script.stage2;
    return rounds[state.roundIndex] || null;
  };

  const currentRound = getCurrentRound();

  // Determine what to show for each position
  const getPositionData = (posIndex: number) => {
    const captainNum = script.positions[posIndex];
    const isNeutral = state.stage === 2 && currentRound?.neutralPosition === posIndex;
    const name = isNeutral ? '' : (captainNames[captainNum] || `קפטן ${captainNum}`);

    // Determine hand direction
    let handDirection: HandDirection | 'ready' = 'ready';
    if (state.phase === 'reveal' || state.phase === 'resolve') {
      handDirection = currentRound?.hands[posIndex] || 'up';
    }

    // Is this position the winner?
    const isWinner = state.phase === 'resolve' &&
      !currentRound?.isReroll &&
      currentRound?.winner === captainNum;

    // Is this position dimmed (loser)?
    const isDimmed = state.phase === 'resolve' &&
      !currentRound?.isReroll &&
      currentRound?.winner !== null &&
      currentRound?.winner !== captainNum;

    // Get rank if already determined
    let rank: number | null = null;
    if (state.firstPlaceWinner === captainNum) {
      rank = 1;
    } else if (state.phase === 'resolve' && !currentRound?.isReroll && state.stage === 2) {
      if (currentRound?.winner === captainNum) {
        rank = 2;
      } else if (!isNeutral) {
        rank = 3;
      }
    }

    return {
      captainNum,
      name,
      isNeutral,
      handDirection,
      isWinner,
      isDimmed,
      rank,
    };
  };

  const topData = getPositionData(0);
  const bottomLeftData = getPositionData(1);
  const bottomRightData = getPositionData(2);

  // Wiggle animation for ready phase
  const wiggleAnimation = prefersReducedMotion.current
    ? {}
    : {
        rotate: [0, -5, 5, -5, 5, 0],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      };

  const renderHandTile = (
    data: ReturnType<typeof getPositionData>,
    position: 'top' | 'left' | 'right',
    positionClass: string
  ) => {
    const assetUrl = getHandAsset(data.handDirection, position);

    return (
      <div className={`absolute ${positionClass} flex flex-col items-center`}>
        {/* Hand image */}
        <motion.div
          className={`relative w-20 h-20 sm:w-24 sm:h-24 ${data.isDimmed ? 'opacity-40' : ''}`}
          animate={
            state.phase === 'ready' && !prefersReducedMotion.current
              ? wiggleAnimation
              : data.isWinner
              ? { scale: [1, 1.1, 1], transition: { duration: 0.3 } }
              : {}
          }
        >
          <img
            src={assetUrl}
            alt={data.handDirection}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback if image not found
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />

          {/* Winner glow */}
          {data.isWinner && (
            <motion.div
              className="absolute inset-0 rounded-full bg-yellow-400/30 blur-xl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.2 }}
            />
          )}

          {/* Rank badge */}
          {data.rank && (
            <motion.div
              className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${getCaptainColor(data.captainNum)}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              {data.rank}
            </motion.div>
          )}
        </motion.div>

        {/* Name label */}
        {!data.isNeutral ? (
          <div
            className={`mt-2 px-3 py-1 rounded-full text-sm font-medium text-white ${getCaptainColor(data.captainNum)} ${data.isDimmed ? 'opacity-40' : ''}`}
          >
            {data.name}
          </div>
        ) : (
          <div className="mt-2 px-3 py-1 rounded-full text-sm text-muted-foreground bg-muted">
            ניטרלי
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      {/* Countdown - Rapid hand shuffle */}
      <AnimatePresence mode="wait">
        {state.phase === 'countdown' && (
          <motion.div
            key="countdown-shuffle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Shuffling hands display */}
            <div className="flex items-center justify-center gap-4">
              {shuffleHands.map((handImg, idx) => (
                <motion.img
                  key={idx}
                  src={handImg}
                  alt="hand"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1, 1.1, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            {/* Countdown number below */}
            <motion.div
              key={`num-${state.countdown}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-bold text-primary"
            >
              {state.countdown > 0 ? state.countdown : "!"}
            </motion.div>
            <p className="text-sm text-muted-foreground">מערבבים...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main game area */}
      {state.phase !== 'countdown' && (
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold mb-1">
              {state.stage === 1 ? 'מי בוחר ראשון?' : 'מי בוחר שני?'}
            </h2>
            {state.showHelper && (
              <p className="text-sm text-muted-foreground">
                היד השונה מנצחת
              </p>
            )}
            {state.stage === 2 && state.roundIndex === 0 && state.phase === 'ready' && (
              <p className="text-xs text-muted-foreground mt-1">
                היד הניטרלית עוזרת להכריע
              </p>
            )}
          </div>

          {/* 1st place winner banner */}
          {state.firstPlaceWinner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center mb-4 px-4 py-2 rounded-xl text-white ${getCaptainColor(state.firstPlaceWinner)}`}
            >
              <span className="font-bold">{captainNames[state.firstPlaceWinner]}</span>
              <span className="mx-2">—</span>
              <span>{getRankLabelHebrew(1)}!</span>
            </motion.div>
          )}

          {/* Hands circle */}
          <div className="relative h-64 sm:h-72">
            {renderHandTile(topData, 'top', POSITIONS.top.className)}
            {renderHandTile(bottomLeftData, 'left', POSITIONS.bottomLeft.className)}
            {renderHandTile(bottomRightData, 'right', POSITIONS.bottomRight.className)}

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {state.rerollMessage && (
                  <motion.div
                    key="reroll"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-muted px-4 py-2 rounded-xl text-sm font-medium"
                  >
                    {state.rerollMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Final result (shown on complete) */}
          {state.phase === 'complete' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <h3 className="text-lg font-bold mb-3">סדר הבחירה:</h3>
              <div className="space-y-2">
                {script.finalOrder.map((captainNum, idx) => (
                  <div
                    key={captainNum}
                    className={`flex items-center justify-center gap-3 px-4 py-2 rounded-xl text-white ${getCaptainColor(captainNum)}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{captainNames[captainNum]}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default PalmRaffleGame;
