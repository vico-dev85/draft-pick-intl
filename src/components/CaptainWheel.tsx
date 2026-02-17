import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getCaptainColor } from "@/lib/draftUtils";
import { useTranslation } from "react-i18next";

interface Captain {
  number: number;
  name: string;
}

interface CaptainWheelProps {
  captains: Captain[];
  onSpinComplete: (order: number[]) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
}

export function CaptainWheel({ captains, onSpinComplete, isSpinning, setIsSpinning }: CaptainWheelProps) {
  const { t } = useTranslation("draft");
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number[] | null>(null);

  const spinWheel = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    // Random spins (5-8 full rotations) + random final position
    const spins = 5 + Math.random() * 3;
    const finalRotation = spins * 360 + Math.random() * 360;

    setRotation(prev => prev + finalRotation);

    // After spin completes, determine winner
    setTimeout(() => {
      // Shuffle captains to get random order
      const shuffled = [...captains].sort(() => Math.random() - 0.5);
      const order = shuffled.map(c => c.number);
      setResult(order);
      setIsSpinning(false);
      onSpinComplete(order);
    }, 4000);
  }, [captains, isSpinning, onSpinComplete, setIsSpinning]);

  const segmentAngle = 360 / 3;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Wheel Container */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-foreground" />
        </div>

        {/* Wheel */}
        <motion.div
          className="w-full h-full rounded-full border-8 border-foreground/20 shadow-2xl overflow-hidden relative"
          animate={{ rotate: rotation }}
          transition={{
            duration: 4,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        >
          {captains.map((captain, index) => {
            const startAngle = index * segmentAngle - 90;
            const endAngle = (index + 1) * segmentAngle - 90;
            const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);

            return (
              <div
                key={captain.number}
                className={`absolute inset-0 ${getCaptainColor(captain.number)}`}
                style={{
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle * Math.PI) / 180)}% ${50 + 50 * Math.sin((startAngle * Math.PI) / 180)}%, ${50 + 50 * Math.cos((endAngle * Math.PI) / 180)}% ${50 + 50 * Math.sin((endAngle * Math.PI) / 180)}%)`,
                }}
              >
                {/* Captain Name */}
                <div
                  className="absolute text-white font-bold text-sm sm:text-base whitespace-nowrap"
                  style={{
                    left: `${50 + 30 * Math.cos(midAngle)}%`,
                    top: `${50 + 30 * Math.sin(midAngle)}%`,
                    transform: `translate(-50%, -50%) rotate(${(startAngle + segmentAngle / 2 + 90)}deg)`,
                  }}
                >
                  {captain.name}
                </div>
              </div>
            );
          })}

          {/* Center Circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-card border-4 border-border flex items-center justify-center shadow-lg">
              <span className="text-2xl">&#9917;</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Spin Button */}
      {!result && (
        <motion.button
          onClick={spinWheel}
          disabled={isSpinning}
          className="px-8 py-4 bg-gradient-primary text-primary-foreground font-bold text-lg rounded-xl shadow-button hover:opacity-90 disabled:opacity-50 transition-all"
          whileHover={{ scale: isSpinning ? 1 : 1.05 }}
          whileTap={{ scale: isSpinning ? 1 : 0.95 }}
        >
          {isSpinning ? t("wheel.spinning") : t("wheel.spin")}
        </motion.button>
      )}

      {/* Result Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h3 className="text-xl font-bold text-foreground mb-4">{t("waiting.raffle.result")}</h3>
          <div className="flex gap-4 justify-center">
            {result.map((captainNum, index) => {
              const captain = captains.find(c => c.number === captainNum);
              return (
                <div
                  key={index}
                  className={`px-4 py-2 rounded-lg ${getCaptainColor(captainNum)} text-white font-bold`}
                >
                  {index + 1}. {captain?.name}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
