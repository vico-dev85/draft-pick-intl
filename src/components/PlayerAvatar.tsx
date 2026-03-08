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

// SVG icon sizes (percentage of container width)
const iconScale: Record<string, number> = {
  xs: 0.6,
  sm: 0.6,
  md: 0.55,
  lg: 0.5,
  xl: 0.5,
};

export function PlayerAvatar({ name, photoUrl, size = "md", className }: PlayerAvatarProps) {
  const oval = ovalSizes[size];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn("rounded-full object-cover flex-shrink-0", className)}
        style={{ width: oval.w, height: oval.h }}
      />
    );
  }

  const scale = iconScale[size];
  const iconW = Math.round(oval.w * scale);
  const iconH = Math.round(oval.h * scale);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden",
        getPlayerColor(name),
        className
      )}
      style={{ width: oval.w, height: oval.h }}
    >
      {/* Player silhouette */}
      <svg
        width={iconW}
        height={iconH}
        viewBox="0 0 24 28"
        fill="none"
        style={{ marginTop: Math.round(oval.h * 0.15) }}
      >
        {/* Head */}
        <circle cx="12" cy="8" r="5" fill="rgba(255,255,255,0.85)" />
        {/* Body/shoulders */}
        <path
          d="M2 26c0-5.5 4.5-10 10-10s10 4.5 10 10"
          fill="rgba(255,255,255,0.7)"
        />
      </svg>
    </div>
  );
}
