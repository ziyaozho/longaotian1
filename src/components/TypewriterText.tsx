import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  skipOnChange?: boolean;
}

export default function TypewriterText({
  text,
  speed = 30,
  className = '',
  onComplete,
  skipOnChange = true,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (skipOnChange) {
      setDisplayed('');
      setIsComplete(false);
      indexRef.current = 0;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const typeNext = () => {
      if (indexRef.current < text.length) {
        const nextIndex = indexRef.current + 1;
        setDisplayed(text.slice(0, nextIndex));
        indexRef.current = nextIndex;
        timerRef.current = setTimeout(typeNext, speed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    timerRef.current = setTimeout(typeNext, speed);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text, speed, skipOnChange, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-0.5 h-[1em] bg-game-accent ml-0.5 align-middle"
        />
      )}
    </span>
  );
}
