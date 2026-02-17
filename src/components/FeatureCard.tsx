import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: string;
  text: string;
  delay?: number;
  className?: string;
}

export function FeatureCard({ icon, text, delay = 0, className }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl bg-card shadow-card border border-border/50",
        className
      )}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-foreground font-medium">{text}</span>
    </motion.div>
  );
}
