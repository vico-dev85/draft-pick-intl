import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { LanguagePicker } from "@/components/LanguagePicker";
import { Logo } from "@/components/ui/logo";

export default function Landing() {
  const { t } = useTranslation("landing");
  const { t: tc } = useTranslation("common");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);

  // Preload background image
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const imgSrc = isMobile
      ? '/assets/bg/landing-mobile.jpg'
      : '/assets/bg/landing-desktop.jpg';

    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.src = imgSrc;
  }, []);

  // Auto-redirect logged-in users to Dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  // Handle query parameters for WhatsApp deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Handle ?join=ROOMCODE for joining drafts
    const joinCodeParam = params.get("join");
    if (joinCodeParam) {
      navigate(`/join/${joinCodeParam.toUpperCase()}`);
      return;
    }

    // Handle ?invite=TOKEN for player invites
    const inviteParam = params.get("invite");
    if (inviteParam) {
      navigate(`/accept-invite?token=${inviteParam}`);
      return;
    }
  }, [navigate]);

  const handleJoinDraft = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 4) {
      setIsJoining(true);
      navigate(`/join/${code}`);
    }
  };

  const handleCreateDraft = () => {
    if (user) {
      navigate("/create-draft");
    } else {
      navigate("/auth");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && joinCode.trim().length === 4) {
      handleJoinDraft();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-purple-900">
      {/* Background Image Layer - pointer-events-none so clicks pass through */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Solid base color - always visible */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-800 to-purple-950" />

        {/* Desktop background (16:9) - fades in when loaded */}
        <div
          className={`hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: "url('/assets/bg/landing-desktop.jpg')",
          }}
        />
        {/* Mobile background (9:16) - fades in when loaded */}
        <div
          className={`md:hidden absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: "url('/assets/bg/landing-mobile.jpg')",
          }}
        />

        {/* Dark overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.6) 100%)",
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 flex justify-between items-center">
          <Logo size="md" variant="light" />
          <div className="flex items-center gap-1">
            <LanguagePicker />
            {!authLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(user ? "/dashboard" : "/auth")}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                {user ? tc("nav.myDrafts") : tc("nav.signIn")}
              </Button>
            )}
          </div>
        </header>

        {/* Main Content - Centered */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm text-center space-y-8"
          >
            {/* Tagline */}
            <div className="space-y-1">
              <p className="text-2xl font-heading font-bold text-white">{t("hero.tagline1")}</p>
              <p className="text-2xl font-heading font-bold text-white">{t("hero.tagline2")}</p>
              <p className="text-2xl font-heading font-bold text-lime-400">{t("hero.tagline3")}</p>
            </div>

            {/* Primary CTA */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="space-y-3"
            >
              <Button
                onClick={handleCreateDraft}
                size="lg"
                className="w-full h-14 text-lg font-bold bg-lime-400 hover:bg-lime-500 text-gray-900 shadow-lg shadow-lime-400/30"
              >
                {t("cta.createClub")}
              </Button>
              <div className="flex items-center justify-center gap-2 text-sm">
                <button
                  onClick={() => navigate("/auth")}
                  className="text-white/50 hover:text-white/80 transition-colors"
                >
                  {t("cta.alreadyHaveAccount")}
                </button>
                <span className="text-white/30">·</span>
                <button
                  onClick={() => navigate("/quick-draft")}
                  className="text-white/50 hover:text-white/80 transition-colors"
                >
                  {t("cta.tryWithoutAccount")}
                </button>
              </div>
            </motion.div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/40" />
              <span className="text-white/80 text-sm font-medium">{t("joinCode.divider")}</span>
              <div className="flex-1 h-px bg-white/40" />
            </div>

            {/* Join Code Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="flex gap-2"
            >
              <Input
                type="text"
                placeholder={t("joinCode.placeholder")}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                maxLength={4}
                className="flex-1 h-12 text-center text-xl font-mono tracking-widest bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 focus:ring-purple-400/20"
                dir="ltr"
              />
              <Button
                onClick={handleJoinDraft}
                disabled={joinCode.trim().length !== 4 || isJoining}
                className="h-12 px-6 bg-white/10 hover:bg-white/30 text-white border-2 border-white/70"
              >
                {isJoining ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("joinCode.join")
                )}
              </Button>
            </motion.div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center">
          <p className="text-white/30 text-xs">
            {t("footer.tagline")}
          </p>
        </footer>
      </div>
    </div>
  );
}
