import { cn } from "@/lib/utils";
import { getCaptainColor } from "@/lib/draftUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface TurnBannerProps {
  captainNumber: number;
  captainName: string;
  isMyTurn: boolean;
  soloTeamLabel?: string;
}

export function TurnBanner({ captainNumber, captainName, isMyTurn, soloTeamLabel }: TurnBannerProps) {
  const { t } = useTranslation("draft");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={captainNumber}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
        className={cn(
          "rounded-xl px-4 py-2.5 text-center text-white font-medium",
          getCaptainColor(captainNumber)
        )}
      >
        {soloTeamLabel ? (
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center justify-center gap-2"
          >
            <span className="text-lg font-heading font-bold">{soloTeamLabel}</span>
          </motion.div>
        ) : isMyTurn ? (
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center justify-center gap-2"
          >
            <span className="text-lg font-heading font-bold">{t("board.yourTurn")}</span>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span>{t("board.captainPicking", { captain: captainName })}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default TurnBanner;
