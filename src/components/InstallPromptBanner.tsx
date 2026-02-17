import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface InstallPromptBannerProps {
  variant: "results" | "dashboard";
}

export function InstallPromptBanner({ variant }: InstallPromptBannerProps) {
  const { shouldShowPrompt, canInstall, isIOS, promptInstall, dismiss } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);

  // Delay appearance for results variant
  useEffect(() => {
    if (!shouldShowPrompt) return;

    if (variant === "results") {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [shouldShowPrompt, variant]);

  if (!shouldShowPrompt || !visible) return null;

  const handleInstall = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSSheet(true);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    dismiss();
  };

  if (variant === "results") {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-emerald-600/30 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-emerald-400/30 relative"
          dir="rtl"
        >
          {/* Dismiss button — top-left for RTL */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 left-2 w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
            aria-label="סגור"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <Download className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0 pl-6">
              <p className="text-white font-bold text-sm">
                התקן לגישה מהירה
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                במשחק הבא — כוחות בקליק אחד מהמסך
              </p>
            </div>
          </div>

          <Button
            onClick={handleInstall}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-10 gap-2 font-bold"
          >
            <Download className="h-4 w-4" />
            {isIOS ? "הוסף למסך הבית" : "התקן את כוחות"}
          </Button>
        </motion.div>

        {/* iOS Instructions Sheet */}
        {isIOS && (
          <IOSInstructionsSheet
            isOpen={showIOSSheet}
            onClose={() => setShowIOSSheet(false)}
          />
        )}
      </>
    );
  }

  // variant === "dashboard"
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Download className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="flex-1 text-white/70 text-sm">
            התקן לגישה מהירה מהמסך
          </p>
          <Button
            onClick={handleInstall}
            size="sm"
            className="bg-emerald-500/80 hover:bg-emerald-500 text-white text-xs h-8 px-3"
          >
            התקן
          </Button>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
            aria-label="סגור"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>

      {/* iOS Instructions Sheet */}
      {isIOS && (
        <IOSInstructionsSheet
          isOpen={showIOSSheet}
          onClose={() => setShowIOSSheet(false)}
        />
      )}
    </>
  );
}

// iOS Instructions Bottom Sheet
function IOSInstructionsSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-emerald-900 rounded-t-2xl border-t border-emerald-400/30 p-6 pb-8"
            dir="rtl"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

            <h3 className="text-white font-bold text-lg mb-5 text-center">
              הוסף למסך הבית
            </h3>

            <div className="space-y-5">
              {/* Step 1 */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ArrowUp className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    1. לחץ על כפתור השיתוף
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    הריבוע עם החץ למעלה בסרגל הניווט של Safari
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Plus className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    2. גלול ולחץ "הוסף למסך הבית"
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    בתפריט השיתוף שנפתח
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Download className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    3. אשר — כוחות יופיע במסך הבית
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    בפעם הבאה תפתח ישירות מהאייקון
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white h-11 font-bold"
            >
              הבנתי
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
