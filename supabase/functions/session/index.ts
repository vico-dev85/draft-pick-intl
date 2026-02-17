import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Session max age: 30 days in seconds
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Generate cryptographically secure session ID
function generateSessionId(): string {
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
  const maxAgeMs = SESSION_MAX_AGE_SECONDS * 1000;
  return Date.now() - createdAt > maxAgeMs;
}

// Parse cookies from request header
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = value;
    }
    return cookies;
  }, {} as Record<string, string>);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    let sessionId = cookies["draft_session"];
    let needsNewSession = false;

    // Check if existing session is valid
    if (!sessionId || isSessionExpired(sessionId)) {
      sessionId = generateSessionId();
      needsNewSession = true;
    }

    // Determine if we're in a secure context (HTTPS)
    const isSecure = req.url.startsWith("https://") || 
                     req.headers.get("x-forwarded-proto") === "https";

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set("Content-Type", "application/json");

    // Set httpOnly cookie if new session or refreshing
    if (needsNewSession || req.method === "POST") {
      const cookieValue = [
        `draft_session=${sessionId}`,
        `Path=/`,
        `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
        `HttpOnly`,
        `SameSite=Lax`,
      ];
      
      // Only add Secure flag in HTTPS context
      if (isSecure) {
        cookieValue.push("Secure");
      }

      responseHeaders.set("Set-Cookie", cookieValue.join("; "));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        session_id: sessionId,
        is_new: needsNewSession 
      }),
      { 
        status: 200, 
        headers: responseHeaders 
      }
    );
  } catch (error) {
    console.error("Session error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
