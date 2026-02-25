import { cn } from "@/lib/utils";

const PLAYER_COLORS = [
  "player-color-1",
  "player-color-2",
  "player-color-3",
  "player-color-4",
  "player-color-5",
  "player-color-6",
  "player-color-7",
  "player-color-8",
];

function getPlayerColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PLAYER_COLORS[hash % PLAYER_COLORS.length];
}

function getInitials(name: string): string {
  return name.slice(0, 2);
}

interface PlayerAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

// Oval sizes for photos (width × height, ~1:1.35 ratio)
const ovalSizes: Record<string, { w: number; h: number }> = {
  xs: { w: 24, h: 32 },
  sm: { w: 32, h: 42 },
  md: { w: 40, h: 54 },
  lg: { w: 56, h: 76 },
  xl: { w: 72, h: 96 },
};

// Oval sizes for initials fallback (same ratio as photos)
const sizeClasses = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-xl",
};

export function PlayerAvatar({ name, photoUrl, size = "md", className }: PlayerAvatarProps) {
  if (photoUrl) {
    const oval = ovalSizes[size];
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn("rounded-full object-cover flex-shrink-0", className)}
        style={{ width: oval.w, height: oval.h }}
      />
    );
  }

  const oval = ovalSizes[size];
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold flex-shrink-0",
        getPlayerColor(name),
        sizeClasses[size],
        className
      )}
      style={{ width: oval.w, height: oval.h }}
    >
      {getInitials(name)}
    </div>
  );
}
