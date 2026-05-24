import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MangaPanelProps {
  children: ReactNode;
  pageNumber?: number;
  screentone?: '10' | '30' | 'cross';
  className?: string;
  animate?: boolean;
  shake?: boolean;
}

export default function MangaPanel({
  children,
  pageNumber,
  screentone,
  className = '',
  animate = true,
  shake = false,
}: MangaPanelProps) {
  const panel = (
    <div className={`manga-panel ${className}`}>
      {/* Screentone overlay — low opacity so text stays readable */}
      {screentone && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: screentone === 'cross'
              ? 'repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 1px, transparent 1px, transparent 4px), repeating-linear-gradient(-45deg, #1a1a1a 0px, #1a1a1a 1px, transparent 1px, transparent 4px)'
              : 'repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%)',
            backgroundSize: screentone === '30' ? '3px 3px' : '4px 4px',
            opacity: 0.06,
          }}
          aria-hidden="true"
        />
      )}
      {pageNumber !== undefined && (
        <div className="absolute top-2 right-3 flex items-center justify-center z-10">
          <div
            className="w-5 h-5 flex items-center justify-center text-xs font-bold"
            style={{
              background: 'repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%)',
              backgroundSize: '3px 3px',
              borderRadius: '50%',
              color: '#1a1a1a',
            }}
          >
            {pageNumber}
          </div>
        </div>
      )}
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
