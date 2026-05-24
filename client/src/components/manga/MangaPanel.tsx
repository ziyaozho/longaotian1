import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MangaPanelProps {
  children: ReactNode;
  screentone?: '10' | '30' | 'cross';
  className?: string;
  animate?: boolean;
  shake?: boolean;
}

export default function MangaPanel({
  children,
  screentone,
  className = '',
  animate = true,
  shake = false,
}: MangaPanelProps) {
  const panel = (
    <div className={`manga-panel ${className}`}>
      <div className="relative z-[1]">{children}</div>
    </div>
  );

  if (!animate && !shake) return panel;

  const shakeAnim = shake ? {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.3 },
  } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, ...shakeAnim }}
      transition={{ duration: 0.3 }}
    >
      {panel}
    </motion.div>
  );
}
