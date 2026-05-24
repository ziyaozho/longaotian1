import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MangaTitleProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  shake?: boolean;
  className?: string;
}

export default function MangaTitle({
  children,
  as: Tag = 'h1',
  shake = false,
  className = '',
}: MangaTitleProps) {
  const baseClass = 'manga-title';
  const sizeClass =
    Tag === 'h1' ? 'text-5xl md:text-6xl' :
    Tag === 'h2' ? 'text-3xl md:text-4xl' :
    'text-xl md:text-2xl';

  const element = (
    <Tag
      className={`${baseClass} ${sizeClass} ${className}`}
      style={{ transform: `rotate(${(Math.random() - 0.5) * 2}deg)` }}
    >
      {children}
    </Tag>
  );

  if (!shake) return element;

  return (
    <motion.div
      animate={{
        x: [0, -2, 2, -1, 1, 0],
        y: [0, 1, -1, 0.5, -0.5, 0],
      }}
      transition={{
        duration: 0.4,
        repeat: Infinity,
        repeatDelay: 3,
      }}
    >
      {element}
    </motion.div>
  );
}
