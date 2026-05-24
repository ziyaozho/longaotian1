import { motion, AnimatePresence } from 'framer-motion';

interface OnomatopoeiaProps {
  text: string;
  variant?: 'impact' | 'movement' | 'emphasis' | 'meme';
  className?: string;
  color?: string;
}

const variantStyles: Record<string, {
  rotate: number; scale: number;
  animate: Record<string, number[]>;
  style: Record<string, string>;
}> = {
  impact: {
    rotate: -5, scale: 1.5,
    animate: { scale: [0.3, 1.5] },
    style: { fontSize: '3rem', color: '#1a1a1a', textShadow: '4px 4px 0 #ccc' },
  },
  movement: {
    rotate: 8, scale: 1.2,
    animate: { scale: [0.3, 1.2] },
    style: { fontSize: '2.5rem', color: '#1a1a1a', textShadow: '3px 3px 0 #ccc' },
  },
  emphasis: {
    rotate: -3, scale: 1.3,
    animate: { scale: [0.3, 1.3] },
    style: { fontSize: '2.5rem', color: '#1a1a1a', textShadow: '3px 3px 0 #ccc' },
  },
  meme: {
    rotate: 0, scale: 1.8,
    animate: {
      scale: [0.1, 1.8, 1.6],
      rotate: [0, 5, -3, 0],
    },
    style: {
      fontSize: '4rem',
      color: '#1a1a1a',
      textShadow: '6px 6px 0 rgba(0,0,0,0.15)',
      fontWeight: '900',
      fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    },
  },
};

export default function Onomatopoeia({
  text,
  variant = 'impact',
  className = '',
  color,
}: OnomatopoeiaProps) {
  const style = variantStyles[variant] || variantStyles.impact;

  const mergedStyle: Record<string, string> = {
    ...style.style,
    fontFamily: variant === 'meme' ? "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"
      : "'Bangers', cursive",
    fontSize: variant === 'meme' ? 'clamp(2rem, 8vw, 4rem)' : style.style.fontSize,
    display: 'inline-block',
    pointerEvents: 'none',
    ...(color ? { color } : {}),
  };
  if (variant !== 'meme') {
    mergedStyle.transform = `rotate(${style.rotate}deg)`;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={style.animate}
        exit={{ opacity: 0, scale: 2 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        className={`${className} max-[768px]:scale-70`}
        style={mergedStyle}
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
