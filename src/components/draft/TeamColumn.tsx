import { cn } from "@/lib/utils";
import { getCaptainColor, getCaptainBorderColor } from "@/lib/draftUtils";
import { PlayerChip } from "./PlayerChip";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
}

interface TeamColumnProps {
  captainNumber: 1 | 2 | 3;
  captainName: string;
  captainPhotoUrl?: string | null;
  players: Player[];
  isActive: boolean;
  totalPlayersInDraft: number;
}

export function TeamColumn({
  captainNumber,
  captainName,
  captainPhotoUrl,
  players,
  isActive,
  totalPlayersInDraft,
}: TeamColumnProps) {
  const expectedTeamSize = Math.ceil(totalPlayersInDraft / 3);
  const pickCount = players.length;

  return (
    <div
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all duration-200",
        isActive ? getCaptainBorderColor(captainNumber) : "border-gray-200",
        isActive && "ring-2 ring-offset-2 ring-emerald-300 animate-glow"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-3 py-2 text-white text-center",
          getCaptainColor(captainNumber)
        )}
      >
        <div className="text-xs opacity-90">קבוצה {captainNumber}</div>
        <div className="text-sm font-bold">
          ({pickCount}/{expectedTeamSize})
        </div>
      </div>

      {/* Players list */}
      <div className="p-2 space-y-1.5 min-h-[140px] bg-white/80">
        {/* Captain */}
        <PlayerChip
          name={captainName}
          photoUrl={captainPhotoUrl}
          size="sm"
          state="picked"
          showCrown={true}
        />

        {/* Picked players */}
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              layoutId={`player-${player.id}`}
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                delay: index * 0.05,
              }}
            >
              <PlayerChip
                name={player.name}
                photoUrl={player.photoUrl}
                size="sm"
                state="picked"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default TeamColumn;
