import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light";
}

const sizeMap = {
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
  xl: "h-14",
};

export function Logo({ className, size = "md", variant = "default" }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="PickNKick"
      className={cn(sizeMap[size], "w-auto", variant === "light" ? "brightness-0 invert" : "", className)}
    />
  );
}
