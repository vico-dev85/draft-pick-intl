import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Landing stays in main bundle for fastest first paint
import Landing from "./pages/Landing";

// Retry wrapper for lazy imports — handles chunk loading failures after deployments.
// If the chunk fails to load (stale service worker, network blip), reload the page once.
function lazyRetry<T extends { default: React.ComponentType<unknown> }>(
  importFn: () => Promise<T>
) {
  return lazy(() =>
    importFn().catch(() => {
      // Check if we already tried reloading for this session
      const reloaded = sessionStorage.getItem("chunk_reload");
      if (!reloaded) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
        // Return a never-resolving promise while the page reloads
        return new Promise<T>(() => {});
      }
      // Already reloaded once — clear flag and let ErrorBoundary handle it
      sessionStorage.removeItem("chunk_reload");
      return importFn();
    })
  );
}

// All other routes lazy-loaded — only downloaded when visited
const Auth = lazyRetry(() => import("./pages/Auth"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Players = lazyRetry(() => import("./pages/Players"));
const CreateDraft = lazyRetry(() => import("./pages/CreateDraft"));
const JoinDraft = lazyRetry(() => import("./pages/JoinDraft"));
const WaitingRoom = lazyRetry(() => import("./pages/WaitingRoom"));
const DraftBoard = lazyRetry(() => import("./pages/DraftBoard"));
const SoloDraftBoard = lazyRetry(() => import("./pages/SoloDraftBoard"));
const Results = lazyRetry(() => import("./pages/Results"));
const QuickDraft = lazyRetry(() => import("./pages/QuickDraft"));
const AcceptInvite = lazyRetry(() => import("./pages/AcceptInvite"));
const GameNight = lazyRetry(() => import("./pages/GameNight"));
const NightResults = lazyRetry(() => import("./pages/NightResults"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const Terms = lazyRetry(() => import("./pages/Terms"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Check for OAuth tokens synchronously before any rendering
// Supports both implicit flow (tokens in hash) and PKCE flow (code in query string)
function hasOAuthTokenInUrl(): boolean {
  const hash = window.location.hash;
  const search = window.location.search;
  return hash.includes("access_token=") || hash.includes("error=") || search.includes("code=");
}

// Component to handle OAuth callback tokens in URL hash
function OAuthCallbackHandler({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  // Use synchronous initial check to prevent any flash
  const [isProcessingAuth, setIsProcessingAuth] = useState(hasOAuthTokenInUrl);

  useEffect(() => {
    if (isProcessingAuth) {
      // Give Supabase time to process the token/code exchange, then redirect
      // PKCE code exchange may take longer than implicit flow
      const timer = setTimeout(() => {
        // Clean up query string (PKCE leaves ?code= in URL)
        if (window.location.search.includes("code=")) {
          window.history.replaceState({}, "", window.location.pathname + window.location.hash);
        }

        // Check if there's a pending invite or auth return URL
        const pendingInviteToken = sessionStorage.getItem("pendingInviteToken")
          || localStorage.getItem("pendingInviteToken");
        const authReturnTo = localStorage.getItem("authReturnTo");

        // Clean up both storages after reading
        if (pendingInviteToken) {
          sessionStorage.removeItem("pendingInviteToken");
          localStorage.removeItem("pendingInviteToken");
          // Redirect to accept-invite page to complete the invite flow
          window.location.hash = `#/accept-invite?token=${encodeURIComponent(pendingInviteToken)}`;
        } else if (authReturnTo) {
          localStorage.removeItem("authReturnTo");
          const safePath = getSafeRedirectPath(authReturnTo);
          window.location.hash = `#${safePath}`;
        } else {
          window.location.hash = "#/dashboard";
        }
        setIsProcessingAuth(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isProcessingAuth]);

  if (isProcessingAuth) {
    return (
      <div className="min-h-screen bg-purple-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="text-white/70">{t("status.connecting")}</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Dark loading skeleton for dark-themed pages (Auth, WaitingRoom, Results, GameNight)
const DarkSkeleton = () => (
  <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-white/40" />
  </div>
);

// Clear chunk reload flag on successful app mount
if (sessionStorage.getItem("chunk_reload")) {
  sessionStorage.removeItem("chunk_reload");
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OAuthCallbackHandler>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
          <HashRouter>
            <Suspense fallback={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
            <Routes>
              <Route path="/" element={<Landing />} />
              {/* Dark-themed pages get a dark loading skeleton to prevent light flash */}
              <Route path="/auth" element={<Suspense fallback={<DarkSkeleton />}><Auth /></Suspense>} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/create-draft" element={<CreateDraft />} />
              <Route path="/join/:roomCode" element={<JoinDraft />} />
              <Route path="/room/:roomCode" element={<Suspense fallback={<DarkSkeleton />}><WaitingRoom /></Suspense>} />
              <Route path="/draft/:roomCode" element={<DraftBoard />} />
              <Route path="/solo-draft" element={<SoloDraftBoard />} />
              <Route path="/results/:roomCode" element={<Suspense fallback={<DarkSkeleton />}><Results /></Suspense>} />
              <Route path="/night/:nightId" element={<Suspense fallback={<DarkSkeleton />}><GameNight /></Suspense>} />
              <Route path="/night-results/:nightId" element={<Suspense fallback={<DarkSkeleton />}><NightResults /></Suspense>} />
              <Route path="/quick-draft" element={<QuickDraft />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </HashRouter>
          </ErrorBoundary>
        </OAuthCallbackHandler>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
