/**
 * Validates that a redirect path is a safe, relative path within the app.
 * Prevents open redirect attacks via user-controlled localStorage/sessionStorage values.
 */
export function isSafeRedirectPath(path: string): boolean {
  // Must start with / and not contain protocol or double slashes
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  // Must only contain safe URL characters
  if (!/^\/[a-zA-Z0-9\-_/?=&#%.]+$/.test(path)) return false;
  return true;
}

/**
 * Returns the redirect path if safe, otherwise falls back to /dashboard.
 */
export function getSafeRedirectPath(path: string | null, fallback = "/dashboard"): string {
  if (!path) return fallback;
  return isSafeRedirectPath(path) ? path : fallback;
}
