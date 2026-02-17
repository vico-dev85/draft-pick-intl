import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";

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

function truncateName(name: string, maxLength = 9): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "...";
}

export type PlayerChipState = "available" | "selected" | "picked" | "disabled" | "highlighted";

interface PlayerChipProps {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md";
  state?: PlayerChipState;
  showCrown?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PlayerChip({
  name,
  photoUrl,
  size = "md",
  state = "available",
  showCrown = false,
  onClick,
  className,
}: PlayerChipProps) {
  const isClickable = state === "available" || state === "highlighted" || state === "selected";

  const sizeStyles = {
    sm: {
      container: "h-8 px-2 py-1 gap-2",
      avatar: "w-6 h-6",
      avatarText: "text-[10px]",
      name: "text-xs",
      crown: "w-3.5 h-3.5 -top-1 -right-1",
      crownIcon: "w-2 h-2",
    },
    md: {
      container: "h-10 px-2.5 py-1.5 gap-2.5",
      avatar: "w-7 h-7",
      avatarText: "text-[11px]",
      name: "text-sm",
      crown: "w-4 h-4 -top-1 -right-1",
      crownIcon: "w-2.5 h-2.5",
    },
  };

  const s = sizeStyles[size];

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "flex items-center rounded-xl text-right w-full transition-all duration-150",
        s.container,
        // State styles - explicit light theme colors
        state === "available" && "bg-white hover:bg-gray-50 border border-gray-200 cursor-pointer",
        state === "highlighted" && "bg-emerald-50 border-2 border-emerald-500 cursor-pointer ring-2 ring-emerald-300",
        state === "selected" && "bg-emerald-100 border-2 border-emerald-500 cursor-pointer scale-[1.02] shadow-md",
        state === "picked" && "bg-gray-100 border border-gray-200",
        state === "disabled" && "bg-gray-50 border border-gray-100 opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className={cn("rounded-full object-cover", s.avatar)}
          />
        ) : (
          <div
            className={cn(
              "rounded-full flex items-center justify-center text-white font-bold",
              s.avatar,
              s.avatarText,
              getPlayerColor(name)
            )}
          >
            {getInitials(name)}
          </div>
        )}
        {/* Crown badge for captains */}
        {showCrown && (
          <div className={cn("absolute bg-yellow-400 rounded-full flex items-center justify-center", s.crown)}>
            <Crown className={cn("text-yellow-900", s.crownIcon)} />
          </div>
        )}
      </div>

      {/* Name */}
      <span className={cn(
        "font-medium truncate flex-1 text-right text-gray-900",
        s.name,
        state === "picked" && "text-gray-600",
        state === "disabled" && "text-gray-400",
      )}>
        {truncateName(name)}
      </span>
    </button>
  );
}

export default PlayerChip;
