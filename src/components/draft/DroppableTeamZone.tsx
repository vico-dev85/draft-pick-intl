import { useDroppable } from "@dnd-kit/core";
import { TeamColumn } from "./TeamColumn";
import { cn } from "@/lib/utils";
import { getCaptainBorderColor } from "@/lib/draftUtils";

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
}

interface DroppableTeamZoneProps {
  teamNumber: number;
  captainName: string;
  captainPhotoUrl?: string | null;
  players: Player[];
  isActive: boolean;
  totalPlayersInDraft: number;
  numTeams: number;
  /** Click handler for assigned players (tap to unassign) */
  onPlayerClick?: (playerId: string) => void;
  /** When true, assigned players inside the team are draggable */
  draggable?: boolean;
  /** When true, hides the captain player chip */
  hideCaptainChip?: boolean;
}

export function DroppableTeamZone({
  teamNumber,
  captainName,
  captainPhotoUrl,
  players,
  isActive,
  totalPlayersInDraft,
  numTeams,
  onPlayerClick,
  draggable = false,
  hideCaptainChip = false,
}: DroppableTeamZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `team-${teamNumber}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200 rounded-xl",
        isOver && `ring-4 ring-offset-2 ring-offset-gray-100 ${getCaptainBorderColor(teamNumber).replace("border-", "ring-")} scale-[1.02]`,
        isOver && "bg-blue-50/30"
      )}
    >
      <TeamColumn
        captainNumber={teamNumber}
        captainName={captainName}
        captainPhotoUrl={captainPhotoUrl}
        players={players}
        isActive={isActive || isOver}
        totalPlayersInDraft={totalPlayersInDraft}
        numTeams={numTeams}
        onPlayerClick={onPlayerClick}
        draggable={draggable}
        hideCaptainChip={hideCaptainChip}
      />
    </div>
  );
}

export default DroppableTeamZone;
