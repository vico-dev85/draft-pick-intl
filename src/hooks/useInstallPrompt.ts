import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    if (isNaN(timestamp)) return false;
    return Date.now() - timestamp < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  // iOS standalone
  if ((navigator as any).standalone === true) return true;
  // Standard display-mode check
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

export function useInstallPrompt() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS] = useState(isIOSDevice);
  const [isStandalone, setIsStandalone] = useState(isStandaloneMode);
  const [isDismissed, setIsDismissed] = useState(isDismissedRecently);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Listen for display-mode changes
    const mql = window.matchMedia("(display-mode: standalone)");
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mql.addEventListener("change", handleDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mql.removeEventListener("change", handleDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return "unavailable";

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPromptRef.current = null;
    setCanInstall(false);

    if (outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setIsDismissed(true);
    }

    return outcome;
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsDismissed(true);
  }, []);

  const shouldShowPrompt = (canInstall || isIOS) && !isDismissed && !isStandalone;

  return {
    canInstall,
    isIOS,
    isStandalone,
    isDismissed,
    shouldShowPrompt,
    promptInstall,
    dismiss,
  };
}
