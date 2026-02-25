import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PlayerChip, type PlayerChipState } from "./PlayerChip";

interface DraggablePlayerChipProps {
  id: string;
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md";
  state?: PlayerChipState;
  onClick?: () => void;
}

export function DraggablePlayerChip({
  id,
  name,
  photoUrl,
  size = "md",
  state = "highlighted",
  onClick,
}: DraggablePlayerChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <PlayerChip
        name={name}
        photoUrl={photoUrl}
        size={size}
        state={state}
        onClick={onClick}
        className={isDragging ? "shadow-lg scale-105" : ""}
      />
    </div>
  );
}

export default DraggablePlayerChip;
