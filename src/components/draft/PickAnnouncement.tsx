import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PickAnnouncementProps {
  id: string; // Unique ID for proper AnimatePresence keying
  pickerName: string; // "You" for self, captain name for others
  playerName: string;
  isMe: boolean;
  onComplete: () => void;
}

export function PickAnnouncement({
  id,
  pickerName,
  playerName,
  isMe,
  onComplete,
}: PickAnnouncementProps) {
  const { t } = useTranslation("draft");
  const isMountedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  onCompleteRef.current = onComplete;

  useEffect(() => {
    isMountedRef.current = true;

    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        onCompleteRef.current();
      }
    }, 2500);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, [id]); // Only re-run if id changes (new announcement)

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: 0.25,
        ease: "easeOut"
      }}
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4"
    >
      <div
        className={`
          px-6 py-4 rounded-2xl shadow-2xl
          flex items-center gap-3
          ${isMe
            ? "bg-emerald-600 text-white"
            : "bg-white text-gray-900 border-2 border-gray-200 shadow-xl"
          }
        `}
      >
        {isMe && (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
        )}

        <div className="text-center">
          {isMe ? (
            <span className="text-lg font-semibold">
              {t("board.announcement.youPicked", { player: playerName })}
            </span>
          ) : (
            <span className="text-lg">
              {t("board.announcement.captainPicked", { captain: pickerName, player: playerName })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default PickAnnouncement;
