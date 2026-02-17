import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCaptainColor } from "@/lib/draftUtils";

interface ConfirmPickModalProps {
  playerName: string;
  playerPhotoUrl?: string | null;
  captainNumber: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const PLAYER_COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
];

function getPlayerColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PLAYER_COLORS[hash % PLAYER_COLORS.length];
}

function getInitials(name: string): string {
  return name.slice(0, 2);
}

export function ConfirmPickModal({
  playerName,
  playerPhotoUrl,
  captainNumber,
  onConfirm,
  onCancel,
}: ConfirmPickModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={cn(
          "relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden",
          "bg-white border-2",
          getCaptainColor(captainNumber).replace("bg-", "border-")
        )}
      >
        {/* Header with captain color */}
        <div className={cn("px-6 py-4 text-white text-center", getCaptainColor(captainNumber))}>
          <p className="text-lg font-bold">בחר שחקן?</p>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Player avatar - large */}
          <div className="flex justify-center mb-4">
            {playerPhotoUrl ? (
              <img
                src={playerPhotoUrl}
                alt={playerName}
                className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold",
                  getPlayerColor(playerName)
                )}
              >
                {getInitials(playerName)}
              </div>
            )}
          </div>

          {/* Player name */}
          <h3 className="text-xl font-bold text-gray-900 mb-6">{playerName}</h3>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              size="lg"
              className="flex-1 h-12 text-base"
            >
              <X className="w-5 h-5 ml-2" />
              ביטול
            </Button>
            <Button
              onClick={onConfirm}
              size="lg"
              className={cn(
                "flex-1 h-12 text-base text-white",
                getCaptainColor(captainNumber),
                "hover:opacity-90"
              )}
            >
              <Check className="w-5 h-5 ml-2" />
              בחר!
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ConfirmPickModal;
