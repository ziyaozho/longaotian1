import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Swords, Gift, TrendingUp, MapPin, Trophy, ArrowUp, Skull, Sparkles, BookOpen } from 'lucide-react';
import MangaPanel from './MangaPanel';
import SpeedLines from './SpeedLines';
import Onomatopoeia from './Onomatopoeia';

export type ImpactEventType =
  | 'combat_victory'
  | 'combat_defeat'
  | 'loot_explosion'
  | 'breakthrough'
  | 'world_transition'
  | 'achievement'
  | 'level_up'
  | 'story_result';

export interface ImpactStat {
  label: string;
  value: number;
}

export interface ImpactItem {
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface ImpactFrameProps {
  eventType: ImpactEventType;
  title: string;
  description: string;
  stats?: ImpactStat[];
  items?: ImpactItem[];
  onContinue: () => void;
}

const THEMES: Record<ImpactEventType, {
  accent: string;
  accentBg: string;
  onomatopoeia: string;
  onomatopoeiaColor: string;
  icon: React.ReactNode;
  label: string;
  intensity: 'low' | 'high';
}> = {
  combat_victory: {
    accent: '#c0392b',
    accentBg: '#fdf2f2',
    onomatopoeia: '擊破！',
    onomatopoeiaColor: '#c0392b',
    icon: <Swords className="w-5 h-5" />,
    label: '战斗胜利',
    intensity: 'high',
  },
  combat_defeat: {
    accent: '#555555',
    accentBg: '#f5f5f5',
    onomatopoeia: '敗北…',
    onomatopoeiaColor: '#555555',
    icon: <Skull className="w-5 h-5" />,
    label: '战斗败北',
    intensity: 'low',
  },
  loot_explosion: {
    accent: '#d4a017',
    accentBg: '#fffdf0',
    onomatopoeia: '傳說降臨！',
    onomatopoeiaColor: '#d4a017',
    icon: <Gift className="w-5 h-5" />,
    label: '稀有掉落',
    intensity: 'high',
  },
  breakthrough: {
    accent: '#2980b9',
    accentBg: '#f0f7ff',
    onomatopoeia: '突破！',
    onomatopoeiaColor: '#2980b9',
    icon: <TrendingUp className="w-5 h-5" />,
    label: '境界突破',
    intensity: 'high',
  },
  world_transition: {
    accent: '#8e44ad',
    accentBg: '#faf5ff',
    onomatopoeia: '世界穿越！',
    onomatopoeiaColor: '#8e44ad',
    icon: <MapPin className="w-5 h-5" />,
    label: '世界穿越',
    intensity: 'high',
  },
  achievement: {
    accent: '#d4a017',
    accentBg: '#fffdf0',
    onomatopoeia: '成就達成！',
    onomatopoeiaColor: '#d4a017',
    icon: <Trophy className="w-5 h-5" />,
    label: '成就解锁',
    intensity: 'low',
  },
  level_up: {
    accent: '#27ae60',
    accentBg: '#f0faf4',
    onomatopoeia: '升級！',
    onomatopoeiaColor: '#27ae60',
    icon: <ArrowUp className="w-5 h-5" />,
    label: '等级提升',
    intensity: 'low',
  },
  story_result: {
    accent: '#1a1a1a',
    accentBg: '#f5f0e8',
    onomatopoeia: '結果',
    onomatopoeiaColor: '#1a1a1a',
    icon: <BookOpen className="w-5 h-5" />,
    label: '剧情发展',
    intensity: 'low',
  },
};

const RARITY_COLORS: Record<string, string> = {
  common: '#888888',
  rare: '#2980b9',
  epic: '#8e44ad',
  legendary: '#d4a017',
};

const RARITY_LABELS: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export default function ImpactFrame({
  eventType,
  title,
  description,
  stats,
  items,
  onContinue,
}: ImpactFrameProps) {
  const theme = THEMES[eventType] || THEMES.level_up;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        onClick={onContinue}
      >
        {/* Backdrop */}
        <div className="absolute inset-0" style={{ background: 'rgba(26, 26, 26, 0.9)' }} />

        {/* Speed lines */}
        <SpeedLines active intensity={theme.intensity} className="z-[1]" />

        {/* Content */}
        <motion.div
          initial={{ scale: 0.7, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: -20, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 250, delay: 0.1 }}
          className="relative z-[2] w-full max-w-lg cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Onomatopoeia */}
          <div className="flex justify-center mb-2">
            <Onomatopoeia
              text={theme.onomatopoeia}
              variant="meme"
              color={theme.onomatopoeiaColor}
            />
          </div>

          <MangaPanel className="ink-shadow">
            {/* Header bar */}
            <div
              className="-mx-6 -mt-6 mb-4 px-6 py-3 flex items-center gap-3"
              style={{
                background: 'repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%)',
                backgroundSize: '3px 3px',
              }}
            >
              <div
                className="w-9 h-9 ink-border flex items-center justify-center flex-shrink-0"
                style={{ background: '#f5f0e8', color: theme.accent }}
              >
                {theme.icon}
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-bold font-[family-name:'Bangers',cursive] tracking-wide"
                  style={{ color: '#f5f0e8', textShadow: '2px 2px 0 #1a1a1a' }}
                >
                  {title}
                </h2>
                <span
                  className="manga-badge text-xs"
                  style={{ background: theme.accent }}
                >
                  {theme.label}
                </span>
              </div>
            </div>

            {/* Accent strip */}
            <div
              className="h-1.5 w-full mb-4"
              style={{
                background: 'repeating-conic-gradient(#1a1a1a 0% 25%, transparent 0% 50%)',
                backgroundSize: '3px 3px',
              }}
            />

            {/* Description */}
            <p
              className="text-base md:text-lg mb-5 leading-relaxed font-bold"
              style={{ color: '#1a1a1a' }}
            >
              {description}
            </p>

            {/* Stat changes */}
            {stats && stats.length > 0 && (
              <div className="mb-4 space-y-2">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold w-12 flex-shrink-0 manga-badge"
                      style={{
                        background: stat.value > 0 ? theme.accent : '#888888',
                      }}
                    >
                      {stat.label}
                    </span>
                    <div className="flex-1 h-3 ink-border bg-white relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.abs(stat.value) / 2)}%` }}
                        transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
                        className="h-full"
                        style={{ background: stat.value > 0 ? theme.accent : '#888888' }}
                      />
                    </div>
                    <span
                      className="text-sm font-bold w-16 text-right"
                      style={{ color: stat.value > 0 ? theme.accent : '#888888' }}
                    >
                      {stat.value > 0 ? '+' : ''}{stat.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Items showcase */}
            {items && items.length > 0 && (
              <div className="mb-4">
                <div
                  className="text-xs font-bold mb-2 flex items-center gap-1"
                  style={{ color: '#888888' }}
                >
                  <Sparkles className="w-3 h-3" />
                  获得物品
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: 0.6 + i * 0.15, type: 'spring', damping: 12 }}
                      className="ink-border px-3 py-2 flex items-center gap-2"
                      style={{
                        background: '#f5f0e8',
                        borderColor: RARITY_COLORS[item.rarity],
                      }}
                    >
                      <span
                        className="text-xs manga-badge"
                        style={{ background: RARITY_COLORS[item.rarity] }}
                      >
                        {RARITY_LABELS[item.rarity]}
                      </span>
                      <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>
                        {item.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Continue button */}
            <motion.button
              onClick={onContinue}
              className="manga-btn w-full mt-2 py-3 text-base font-bold flex items-center justify-center gap-2"
              style={{ background: theme.accent }}
              whileTap={{ scale: 0.97 }}
              whileHover={{ filter: 'brightness(1.1)' }}
            >
              <Zap className="w-4 h-4" />
              继续
            </motion.button>
          </MangaPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
