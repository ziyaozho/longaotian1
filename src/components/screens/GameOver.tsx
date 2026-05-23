import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { getSceneById } from '../../data/scenes';
import { getAchievementById } from '../../data/achievements';
import { motion } from 'framer-motion';
import { RotateCcw, Trophy, Home, Star, Clock, Swords, Coins } from 'lucide-react';
import { MangaPanel, MangaTitle } from '../manga';

export default function GameOver() {
  const { setScreen, resetGame } = useGameStore();
  const { player, resetPlayer } = usePlayerStore();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!player) {
    setScreen('start');
    return null;
  }

  const scene = getSceneById(player.progress.sceneType);

  const handleRestart = () => {
    resetPlayer();
    resetGame();
    setScreen('create');
  };

  const handleHome = () => {
    resetPlayer();
    resetGame();
    setScreen('start');
  };

  const survivalScore = Math.min(player.progress.round / 100, 1) * 30;
  const levelScore = Math.min(player.stats.level / 100, 1) * 30;
  const wealthScore = Math.min(player.stats.wealth / 100000, 1) * 20;
  const combatScore = Math.min(player.stats.combatPower / 10000, 1) * 20;
  const totalScore = Math.floor(survivalScore + levelScore + wealthScore + combatScore);

  const getRating = () => {
    if (totalScore >= 90) return { label: 'S', color: '#d4a017', desc: '传说' };
    if (totalScore >= 75) return { label: 'A', color: '#8e44ad', desc: '史诗' };
    if (totalScore >= 60) return { label: 'B', color: '#2980b9', desc: '优秀' };
    if (totalScore >= 40) return { label: 'C', color: '#27ae60', desc: '良好' };
    return { label: 'D', color: '#888888', desc: '普通' };
  };

  const rating = getRating();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <MangaTitle as="h1" shake>
            人生终章
          </MangaTitle>
          <p className="text-game-text-muted mt-2">
            {player.name} · {scene?.name} · {player.progress.age}岁
          </p>
        </div>

        <MangaPanel className="mb-6">
          <h3 className="text-lg font-bold mb-4 text-center manga-title">最终评价</h3>

          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-8xl font-bold font-[family-name:'Bangers',cursive] ink-shadow"
              style={{ color: rating.color }}
            >
              {rating.label}
            </motion.div>
          </div>

          <div className="text-center text-game-text-muted mb-6">
            评分: {totalScore}/100 · {rating.desc}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="ink-border bg-white p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1" style={{ color: '#2980b9' }} />
              <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>{player.progress.round}</div>
              <div className="text-xs text-game-text-muted">存活回合</div>
            </div>
            <div className="ink-border bg-white p-4 text-center">
              <Star className="w-5 h-5 mx-auto mb-1" style={{ color: '#d4a017' }} />
              <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>{player.stats.level}</div>
              <div className="text-xs text-game-text-muted">达到等级</div>
            </div>
            <div className="ink-border bg-white p-4 text-center">
              <Coins className="w-5 h-5 mx-auto mb-1" style={{ color: '#27ae60' }} />
              <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>{player.stats.wealth.toLocaleString()}</div>
              <div className="text-xs text-game-text-muted">最终财富</div>
            </div>
            <div className="ink-border bg-white p-4 text-center">
              <Swords className="w-5 h-5 mx-auto mb-1" style={{ color: '#c0392b' }} />
              <div className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>{player.stats.combatPower}</div>
              <div className="text-xs text-game-text-muted">最终战力</div>
            </div>
          </div>

          {player.achievements.length > 0 && (
            <div className="border-t-3 pt-4" style={{ borderColor: '#1a1a1a' }}>
              <h4 className="font-bold mb-3 flex items-center gap-2 manga-title">
                <Trophy className="w-4 h-4" style={{ color: '#d4a017' }} />
                本局获得成就
              </h4>
              <div className="flex flex-wrap gap-2">
                {player.achievements.map((achId) => {
                  const ach = getAchievementById(achId);
                  return (
                    <span
                      key={achId}
                      className="manga-badge text-xs"
                    >
                      {ach?.name || achId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </MangaPanel>

        <div className="flex items-center justify-center gap-4">
          <motion.button onClick={handleHome} className="manga-btn-outline flex items-center gap-2" whileTap={{ scale: 0.97 }}>
            <Home className="w-4 h-4" />
            返回主页
          </motion.button>
          <motion.button onClick={handleRestart} className="manga-btn flex items-center gap-2" whileTap={{ scale: 0.97 }}>
            <RotateCcw className="w-4 h-4" />
            再次重生
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
