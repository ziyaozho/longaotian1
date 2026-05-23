import { motion, AnimatePresence } from 'framer-motion';

interface SpeedLinesProps {
  active: boolean;
  intensity?: 'low' | 'high';
  className?: string;
}

export default function SpeedLines({
  active,
  intensity = 'low',
  className = '',
}: SpeedLinesProps) {
  const lineCount = intensity === 'high' ? 24 : 12;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
        >
          <svg width="100%" height="100%" className="absolute inset-0">
            {Array.from({ length: lineCount }).map((_, i) => {
              const angle = (i / lineCount) * 360;
              const rad = (angle * Math.PI) / 180;
              const cx = 50 + Math.cos(rad) * 40;
              const cy = 50 + Math.sin(rad) * 40;
              const len = intensity === 'high' ? 30 + Math.random() * 20 : 15 + Math.random() * 10;
              const endX = 50 + Math.cos(rad) * (40 + len);
              const endY = 50 + Math.sin(rad) * (40 + len);

              return (
                <line
                  key={i}
                  x1={`${cx}%`}
                  y1={`${cy}%`}
                  x2={`${endX}%`}
                  y2={`${endY}%`}
                  stroke="#1a1a1a"
                  strokeWidth={0.5 + Math.random() * 1.5}
                  opacity={0.15 + Math.random() * 0.15}
                />
              );
            })}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
