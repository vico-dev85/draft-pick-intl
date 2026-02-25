import { cn } from "@/lib/utils";
import { getCaptainColor, getCaptainBorderColor } from "@/lib/draftUtils";
import { PlayerChip } from "./PlayerChip";
import { DraggablePlayerChip } from "./DraggablePlayerChip";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
}

interface TeamColumnProps {
  captainNumber: number;
  captainName: string;
  captainPhotoUrl?: string | null;
  players: Player[];
  isActive: boolean;
  totalPlayersInDraft: number;
  numTeams?: number;
  /** Optional click handler for individual players (e.g. tap-to-unassign in free mode) */
  onPlayerClick?: (playerId: string) => void;
  /** When true, assigned players are draggable (for DnD mode) */
  draggable?: boolean;
  /** When true, hides the captain player chip (used in solo draft where captain = team name) */
  hideCaptainChip?: boolean;
}

export function TeamColumn({
  captainNumber,
  captainName,
  captainPhotoUrl,
  players,
  isActive,
  totalPlayersInDraft,
  numTeams = 3,
  onPlayerClick,
  draggable = false,
  hideCaptainChip = false,
}: TeamColumnProps) {
  const { t } = useTranslation("draft");
  const expectedTeamSize = Math.ceil(totalPlayersInDraft / numTeams);
  const pickCount = players.length;

  return (
    <div
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all duration-200",
        isActive ? getCaptainBorderColor(captainNumber) : "border-gray-200",
        isActive && "ring-2 ring-offset-2 ring-offset-gray-100 " + getCaptainBorderColor(captainNumber).replace("border-", "ring-")
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-3 py-2 text-white text-center",
          getCaptainColor(captainNumber)
        )}
      >
        <div className="text-xs opacity-90 truncate">{hideCaptainChip ? captainName : t("board.teamCaptain", { captain: captainName, defaultValue: "Team {{captain}}" })}</div>
        <div className="text-sm font-bold">
          {pickCount}/{expectedTeamSize}
        </div>
        {/* Pick progress bar */}
        <div className="mt-1 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/70 rounded-full transition-all duration-500"
            style={{ width: `${expectedTeamSize > 0 ? (pickCount / expectedTeamSize) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Players list */}
      <div className="p-2 space-y-1.5 min-h-[140px] bg-white/80">
        {/* Captain (hidden in solo draft where captainName is just "Team N") */}
        {!hideCaptainChip && (
          <PlayerChip
            name={captainName}
            photoUrl={captainPhotoUrl}
            size="sm"
            state="picked"
            showCrown={true}
          />
        )}

        {/* Picked players */}
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              layoutId={`player-${player.id}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 24,
                delay: index * 0.04,
              }}
            >
              {draggable ? (
                <DraggablePlayerChip
                  id={player.id}
                  name={player.name}
                  photoUrl={player.photoUrl}
                  size="sm"
                  state="available"
                  onClick={onPlayerClick ? () => onPlayerClick(player.id) : undefined}
                />
              ) : (
                <PlayerChip
                  name={player.name}
                  photoUrl={player.photoUrl}
                  size="sm"
                  state={onPlayerClick ? "available" : "picked"}
                  onClick={onPlayerClick ? () => onPlayerClick(player.id) : undefined}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default TeamColumn;
