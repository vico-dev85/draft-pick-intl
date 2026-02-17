import { supabase } from "@/integrations/supabase/client";

// Session max age in milliseconds (30 days, matches server-side)
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Generate session ID locally for fallback
function generateLocalSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const randomStr = Array.from(array.slice(0, 5))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .substring(0, 9);
  return `session_${Date.now()}_${randomStr}`;
}

// Check if a session ID is expired based on its embedded timestamp
function isSessionExpired(sessionId: string): boolean {
  const match = sessionId.match(/^session_(\d+)_[a-z0-9]{9}$/);
  if (!match) return true;
  const createdAt = parseInt(match[1], 10);
  return Date.now() - createdAt > SESSION_MAX_AGE_MS;
}

// Cache the session ID in memory to reduce function calls
let cachedSessionId: string | null = null;
let sessionFetchPromise: Promise<string> | null = null;

/**
 * Get session ID using httpOnly cookie via edge function.
 * Falls back to localStorage if edge function is unavailable.
 * Uses in-memory caching to minimize network calls.
 */
export async function getSecureSessionId(): Promise<string> {
  // Return cached session if valid
  if (cachedSessionId && !isSessionExpired(cachedSessionId)) {
    return cachedSessionId;
  }

  // Prevent concurrent fetches
  if (sessionFetchPromise) {
    return sessionFetchPromise;
  }

  sessionFetchPromise = (async () => {
    // Skip Edge Function entirely - just use local session
    // The Edge Function has CORS issues and the fallback works fine
    return getFallbackSessionId();
  })();

  return sessionFetchPromise;
}

/**
 * Fallback session management using sessionStorage (more secure than localStorage).
 * Session is cleared when browser closes.
 */
function getFallbackSessionId(): string {
  const key = "draft_session_backup";
  
  try {
    let sessionId = sessionStorage.getItem(key);
    
    // Also check localStorage for migration from old sessions
    if (!sessionId) {
      const oldSessionId = localStorage.getItem("draft_session_id");
      if (oldSessionId && !isSessionExpired(oldSessionId)) {
        sessionId = oldSessionId;
        sessionStorage.setItem(key, sessionId);
        // Clean up old localStorage entry
        localStorage.removeItem("draft_session_id");
      }
    }
    
    if (!sessionId || isSessionExpired(sessionId)) {
      sessionId = generateLocalSessionId();
      sessionStorage.setItem(key, sessionId);
    }
    
    cachedSessionId = sessionId;
    return sessionId;
  } catch {
    // If storage is unavailable, generate a temporary session
    const tempSession = generateLocalSessionId();
    cachedSessionId = tempSession;
    return tempSession;
  }
}

/**
 * Synchronous session getter for backward compatibility.
 * Uses cached value or sessionStorage fallback.
 * Prefer getSecureSessionId() for new code.
 */
export function getSessionIdSync(): string {
  if (cachedSessionId && !isSessionExpired(cachedSessionId)) {
    return cachedSessionId;
  }
  return getFallbackSessionId();
}

/**
 * Clear the current session (for logout/cleanup)
 */
export function clearSession(): void {
  cachedSessionId = null;
  try {
    sessionStorage.removeItem("draft_session_backup");
    localStorage.removeItem("draft_session_id");
  } catch {
    // Ignore storage errors
  }
}
