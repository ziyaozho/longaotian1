import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ACHIEVEMENTS } from '../../data/achievements';
import { getGlobalAchievements } from '../../utils/storage';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Lock, Star, Skull, Swords, MapPin, Cpu } from 'lucide-react';
import { MangaPanel, MangaTitle, HalftoneBar } from '../manga';

const categoryIcons: Record<string, React.ReactNode> = {
  progress: <Star className="w-4 h-4" />,
  combat: <Swords className="w-4 h-4" />,
  social: <Trophy className="w-4 h-4" />,
  secret: <Skull className="w-4 h-4" />,
  system: <Cpu className="w-4 h-4" />,
  explore: <MapPin className="w-4 h-4" />,
};

const categoryLabels: Record<string, string> = {
  progress: '进度',
  combat: '战斗',
  social: '社交',
  secret: '秘密',
  system: '系统',
  explore: '探索',
};

export default function AchievementPanel() {
  const { setScreen } = useGameStore();
  const unlockedAchievements = getGlobalAchievements();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const achievementsByCategory = ACHIEVEMENTS.reduce((acc, ach) => {
    if (!acc[ach.category]) acc[ach.category] = [];
    acc[ach.category].push(ach);
    return acc;
  }, {} as Record<string, typeof ACHIEVEMENTS>);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setScreen('start')} className="manga-btn-outline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <MangaTitle as="h2">成就墙</MangaTitle>
          <div className="text-game-text-muted">
            {unlockedAchievements.length} / {ACHIEVEMENTS.length}
          </div>
        </div>

        <MangaPanel className="mb-8">
          <HalftoneBar
            value={unlockedAchievements.length}
            max={ACHIEVEMENTS.length}
            label="总进度"
            color="ink"
          />
        </MangaPanel>

        {Object.entries(achievementsByCategory).map(([category, achievements]) => (
          <div key={category} className="mb-6">
            <h3 className="font-bold mb-3 flex items-center gap-2 manga-title" style={{ color: '#1a1a1a' }}>
              {categoryIcons[category]}
              {categoryLabels[category]}
              <span className="text-xs">({achievements.filter(a => unlockedAchievements.includes(a.id)).length}/{achievements.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((achievement, index) => {
                const isUnlocked = unlockedAchievements.includes(achievement.id);

                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={achievement.hidden && !isUnlocked ? 'hidden' : ''}
                  >
                    <MangaPanel className={!isUnlocked ? 'opacity-50' : ''}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 ink-border flex items-center justify-center bg-white"
                            style={{ color: isUnlocked ? '#d4a017' : '#888888' }}
                          >
                            {isUnlocked ? <Trophy className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-medium" style={{ color: '#1a1a1a' }}>{achievement.name}</div>
                            <div className="text-xs text-game-text-muted">{achievement.description}</div>
                          </div>
                        </div>
                        {achievement.hidden && (
                          <span className="manga-badge text-xs">隐藏</span>
                        )}
                      </div>

                      {isUnlocked && achievement.reward.title && (
                        <div className="mt-2 text-xs" style={{ color: '#d4a017' }}>
                          奖励称号: {achievement.reward.title}
                        </div>
                      )}
                    </MangaPanel>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
