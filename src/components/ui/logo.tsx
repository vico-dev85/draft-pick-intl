import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light";
}

export function Logo({ className, size = "md", variant = "default" }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl",
  };

  return (
    <div className={cn("flex items-center gap-2 font-sans font-bold", sizeClasses[size], className)}>
      <span className={cn(
        size === "sm" ? "text-xl" : size === "lg" ? "text-4xl" : size === "xl" ? "text-5xl" : "text-2xl"
      )} role="img" aria-label="soccer ball">⚽</span>
      <span className={variant === "light" ? "text-white" : "text-gradient-primary"}>Draft Pick</span>
    </div>
  );
}
