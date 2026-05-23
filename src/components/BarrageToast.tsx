import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Gift, Trophy, AlertTriangle, Sparkles, Award, TrendingUp, CheckCircle } from 'lucide-react';

interface BarrageItem {
  id: number;
  text: string;
  icon: string;
  color: string;
}

interface BarrageToastProps {
  items: BarrageItem[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  zap: <Zap className="w-4 h-4" />,
  gift: <Gift className="w-4 h-4" />,
  trophy: <Trophy className="w-4 h-4" />,
  'alert-triangle': <AlertTriangle className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
  award: <Award className="w-4 h-4" />,
  'trending-up': <TrendingUp className="w-4 h-4" />,
  'check-circle': <CheckCircle className="w-4 h-4" />,
};

export default function BarrageToast({ items }: BarrageToastProps) {
  if (items.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-xs">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200, delay: index * 0.05 }}
            className="ink-border ink-shadow px-3 py-2 flex items-center gap-2 max-[768px]:scale-70"
            style={{ background: '#f5f0e8' }}
          >
            <span style={{ color: item.color }}>
              {ICON_MAP[item.icon] || <Sparkles className="w-4 h-4" />}
            </span>
            <span className="text-sm font-bold max-[768px]:text-xs" style={{ color: '#1a1a1a' }}>
              {item.text}
            </span>
            <span
              className="text-xs ml-auto manga-badge max-[768px]:text-[10px]"
              style={{ background: item.color }}
            >
              {Math.floor(Math.random() * 9000 + 1000)}赞
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
