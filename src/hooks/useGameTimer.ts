import { useState, useRef, useCallback, useEffect } from "react";

export type TimerState =
  | "PRE_GAME"
  | "PLAYING"
  | "PAUSED"
  | "GOAL_SCORED"
  | "TIME_UP"
  | "EXTRA_TIME"
  | "EXTRA_TIME_PAUSED"
  | "PENALTIES"
  | "GAME_OVER";

interface UseGameTimerOptions {
  regularDurationMs?: number;
  extraTimeDurationMs?: number;
  lastAttackWarningMs?: number;
  goalLimit?: number;
  onTwoMinWarning?: () => void;
  onOneMinWarning?: () => void;
  onLastAttack?: () => void;
  onTimeUp?: (period: "regular" | "extra_time") => void;
}

const DEFAULTS = {
  regularDurationMs: 8 * 60 * 1000,
  extraTimeDurationMs: 2 * 60 * 1000,
  lastAttackWarningMs: 5 * 1000,
  goalLimit: 2,
};

export function useGameTimer(options: UseGameTimerOptions = {}) {
  const {
    regularDurationMs = DEFAULTS.regularDurationMs,
    extraTimeDurationMs = DEFAULTS.extraTimeDurationMs,
    lastAttackWarningMs = DEFAULTS.lastAttackWarningMs,
    goalLimit = DEFAULTS.goalLimit,
    onTwoMinWarning,
    onOneMinWarning,
    onLastAttack,
    onTimeUp,
  } = options;

  const [state, setState] = useState<TimerState>("PRE_GAME");
  const [remainingMs, setRemainingMs] = useState(regularDurationMs);
  const [currentPeriod, setCurrentPeriod] = useState<"regular" | "extra_time">("regular");

  const startTimeRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const durationRef = useRef<number>(regularDurationMs);
  // Warning flags — fire once per period
  const twoMinFiredRef = useRef(false);
  const oneMinFiredRef = useRef(false);
  const lastAttackFiredRef = useRef(false);

  const resetWarningFlags = useCallback(() => {
    twoMinFiredRef.current = false;
    oneMinFiredRef.current = false;
    lastAttackFiredRef.current = false;
  }, []);

  const tick = useCallback(() => {
    const now = performance.now();
    const elapsed = elapsedBeforePauseRef.current + (now - startTimeRef.current);
    const remaining = Math.max(0, durationRef.current - elapsed);
    setRemainingMs(remaining);

    // Check warnings
    if (remaining <= 120_000 && remaining > 119_000 && !twoMinFiredRef.current) {
      twoMinFiredRef.current = true;
      onTwoMinWarning?.();
    }
    if (remaining <= 60_000 && remaining > 59_000 && !oneMinFiredRef.current) {
      oneMinFiredRef.current = true;
      onOneMinWarning?.();
    }
    if (remaining <= lastAttackWarningMs && remaining > lastAttackWarningMs - 1000 && !lastAttackFiredRef.current) {
      lastAttackFiredRef.current = true;
      onLastAttack?.();
    }

    if (remaining <= 0) {
      cancelAnimationFrame(rafIdRef.current);
      setState("TIME_UP");
      onTimeUp?.(currentPeriod === "regular" ? "regular" : "extra_time");
      return;
    }

    rafIdRef.current = requestAnimationFrame(tick);
  }, [onTwoMinWarning, onOneMinWarning, onLastAttack, onTimeUp, lastAttackWarningMs, currentPeriod]);

  const startTicking = useCallback(() => {
    startTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const start = useCallback(() => {
    durationRef.current = regularDurationMs;
    elapsedBeforePauseRef.current = 0;
    setRemainingMs(regularDurationMs);
    setCurrentPeriod("regular");
    resetWarningFlags();
    setState("PLAYING");
    startTicking();
  }, [regularDurationMs, resetWarningFlags, startTicking]);

  const pause = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    const now = performance.now();
    elapsedBeforePauseRef.current += now - startTimeRef.current;
    setState(currentPeriod === "extra_time" ? "EXTRA_TIME_PAUSED" : "PAUSED");
  }, [currentPeriod]);

  const resume = useCallback(() => {
    setState(currentPeriod === "extra_time" ? "EXTRA_TIME" : "PLAYING");
    startTicking();
  }, [currentPeriod, startTicking]);

  const startExtraTime = useCallback(() => {
    durationRef.current = extraTimeDurationMs;
    elapsedBeforePauseRef.current = 0;
    setRemainingMs(extraTimeDurationMs);
    setCurrentPeriod("extra_time");
    resetWarningFlags();
    setState("EXTRA_TIME");
    startTicking();
  }, [extraTimeDurationMs, resetWarningFlags, startTicking]);

  const goToPenalties = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    setState("PENALTIES");
  }, []);

  const goalScored = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    setState("GOAL_SCORED");
  }, []);

  const endGame = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    setState("GAME_OVER");
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    elapsedBeforePauseRef.current = 0;
    durationRef.current = regularDurationMs;
    setRemainingMs(regularDurationMs);
    setCurrentPeriod("regular");
    resetWarningFlags();
    setState("PRE_GAME");
  }, [regularDurationMs, resetWarningFlags]);

  // Resume from a known elapsed time (for timer recovery after page refresh)
  const resumeFrom = useCallback(
    (elapsedMs: number, period: "regular" | "extra_time", paused: boolean) => {
      const duration = period === "extra_time" ? extraTimeDurationMs : regularDurationMs;
      durationRef.current = duration;
      elapsedBeforePauseRef.current = elapsedMs;
      const remaining = Math.max(0, duration - elapsedMs);
      setRemainingMs(remaining);
      setCurrentPeriod(period);
      resetWarningFlags();

      // Skip warnings that should have already fired
      if (remaining <= 120_000) twoMinFiredRef.current = true;
      if (remaining <= 60_000) oneMinFiredRef.current = true;
      if (remaining <= lastAttackWarningMs) lastAttackFiredRef.current = true;

      if (remaining <= 0) {
        setState("TIME_UP");
        onTimeUp?.(period);
        return;
      }

      if (paused) {
        setState(period === "extra_time" ? "EXTRA_TIME_PAUSED" : "PAUSED");
      } else {
        setState(period === "extra_time" ? "EXTRA_TIME" : "PLAYING");
        startTicking();
      }
    },
    [regularDurationMs, extraTimeDurationMs, lastAttackWarningMs, resetWarningFlags, startTicking, onTimeUp]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // Derived values
  const totalElapsedMs = durationRef.current - remainingMs;
  const currentMinute = Math.floor(totalElapsedMs / 60_000) + 1;
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1_000);
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return {
    state,
    remainingMs,
    totalElapsedMs,
    formattedTime,
    currentMinute,
    currentPeriod,
    goalLimit,
    start,
    pause,
    resume,
    resumeFrom,
    startExtraTime,
    goToPenalties,
    goalScored,
    endGame,
    reset,
  };
}
