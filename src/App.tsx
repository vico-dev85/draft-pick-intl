import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Players from "./pages/Players";
import CreateDraft from "./pages/CreateDraft";
import JoinDraft from "./pages/JoinDraft";
import WaitingRoom from "./pages/WaitingRoom";
import DraftBoard from "./pages/DraftBoard";
import Results from "./pages/Results";
import QuickDraft from "./pages/QuickDraft";
import AcceptInvite from "./pages/AcceptInvite";
import GameNight from "./pages/GameNight";
import NightResults from "./pages/NightResults";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

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
      <div className="min-h-screen bg-emerald-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="text-white/70">מתחבר...</p>
      </div>
    );
  }

  return <>{children}</>;
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
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/create-draft" element={<CreateDraft />} />
              <Route path="/join/:roomCode" element={<JoinDraft />} />
              <Route path="/room/:roomCode" element={<WaitingRoom />} />
              <Route path="/draft/:roomCode" element={<DraftBoard />} />
              <Route path="/results/:roomCode" element={<Results />} />
              <Route path="/night/:nightId" element={<GameNight />} />
              <Route path="/night-results/:nightId" element={<NightResults />} />
              <Route path="/quick-draft" element={<QuickDraft />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
          </ErrorBoundary>
        </OAuthCallbackHandler>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
