import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { getSaves, getGlobalAchievements } from '../../utils/storage';
import { motion } from 'framer-motion';
import { Play, BookOpen, Trophy, RotateCcw } from 'lucide-react';
import { MangaPanel, MangaTitle, Screentone } from '../manga';

export default function StartScreen() {
  const { setScreen } = useGameStore();
  const { setPlayer } = usePlayerStore();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleNewGame = () => setScreen('create');

  const handleContinue = () => {
    const saves = getSaves();
    if (saves.lastSaveId) {
      const player = saves.saves.find((s) => s.id === saves.lastSaveId);
      if (player) {
        setPlayer(player);
        setScreen('game');
      }
    }
  };

  const handleAchievements = () => setScreen('achievements');

  const hasSave = getSaves().saves.length > 0;
  const globalAchievements = getGlobalAchievements();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <MangaPanel className="max-w-lg mx-auto">
          <MangaTitle as="h1" shake>
            龙傲天模拟器
          </MangaTitle>

          <Screentone density="10" className="my-4 h-2" />

          <p className="text-sm text-game-text-muted mb-2">AI+系统流 · 多Agent驱动</p>
          <p className="text-xs text-game-text-muted/60 mb-8">绑定系统，随机场景，无限可能</p>

          <div className="flex flex-col items-center gap-3">
            <div className="pulse-ring w-full">
              <motion.button
                onClick={handleNewGame}
                className="manga-btn flex items-center gap-2 text-lg px-8 py-4 w-full justify-center"
                whileTap={{ scale: 0.97 }}
              >
                <Play className="w-5 h-5" />
                开始新游戏
              </motion.button>
            </div>

            {hasSave && (
              <motion.button
                onClick={handleContinue}
                className="manga-btn-outline flex items-center gap-2 w-full justify-center"
                whileTap={{ scale: 0.97 }}
              >
                <RotateCcw className="w-5 h-5" />
                继续游戏
              </motion.button>
            )}

            <motion.button
              onClick={handleAchievements}
              className="manga-btn-outline flex items-center gap-2 w-full justify-center"
              whileTap={{ scale: 0.97 }}
            >
              <Trophy className="w-5 h-5" />
              成就墙 ({globalAchievements.length})
            </motion.button>
          </div>
        </MangaPanel>

        <div className="mt-8 flex items-center justify-center gap-6 text-game-text-muted text-xs">
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>5个基础场景</span>
          </div>
          <span className="text-game-text-muted/30">·</span>
          <div className="flex items-center gap-1">
            <span>10+系统可选</span>
          </div>
          <span className="text-game-text-muted/30">·</span>
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4" />
            <span>30+成就待解锁</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
