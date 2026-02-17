import { cn } from "@/lib/utils";
import { getCaptainColor } from "@/lib/draftUtils";
import { motion } from "framer-motion";

interface TurnBannerProps {
  captainNumber: number;
  captainName: string;
  isMyTurn: boolean;
}

export function TurnBanner({ captainNumber, captainName, isMyTurn }: TurnBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl px-4 py-2.5 text-center text-white font-medium",
        getCaptainColor(captainNumber)
      )}
    >
      {isMyTurn ? (
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center justify-center gap-2"
        >
          <span className="text-lg font-bold">👆 תורך לבחור!</span>
        </motion.div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <span>{captainName} בוחר...</span>
        </div>
      )}
    </motion.div>
  );
}

export default TurnBanner;
