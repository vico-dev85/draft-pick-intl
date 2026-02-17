import { useEffect, useRef } from "react";

/**
 * Keeps the screen awake using the Screen Wake Lock API.
 *
 * - Acquires lock when `active` is true, releases when false or on unmount
 * - Re-acquires on `visibilitychange` (browser releases lock when tab goes to background)
 * - Silently fails on unsupported browsers (Firefox, older iOS)
 */
export function useWakeLock(active: boolean): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let released = false;

    const acquire = async () => {
      try {
        if (released) return;
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch {
        // Permission denied or not supported — ignore
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !released) {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [active]);
}
