import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingNumberProps {
  value: number;
  label: string;
  color?: string;
  x?: number;
  y?: number;
  onComplete?: () => void;
}

export default function FloatingNumber({
  value,
  label,
  color = 'text-game-green',
  x = 0,
  y = 0,
  onComplete,
}: FloatingNumberProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onComplete?.(), 300);
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1, y: y, x: x, scale: 0.8 }}
          animate={{ opacity: 0, y: y - 60, x, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="fixed pointer-events-none z-50 font-bold text-lg"
          style={{
            left: '50%',
            top: '50%',
            color: color,
            textShadow: '2px 2px 0 rgba(0,0,0,0.1)',
            fontFamily: "'Bangers', cursive",
            letterSpacing: '1px',
          }}
        >
          <div className="flex items-center gap-1">
            <span>{value >= 0 ? '+' : ''}{value}</span>
            <span className="text-sm opacity-80">{label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
