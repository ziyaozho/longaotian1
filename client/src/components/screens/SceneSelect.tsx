import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { SCENES, getAvailableScenes } from '../../data/scenes';
import { getGlobalAchievements, getVisitedScenes } from '../../utils/storage';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, MapPin } from 'lucide-react';
import { MangaPanel, MangaTitle } from '../manga';
import type { SceneType } from '../../types';

const difficultyLabels: Record<number, string> = {
  1: '简单', 2: '简单', 3: '中等', 4: '中等', 5: '困难', 6: '困难', 7: '极难', 8: '极难',
};

export default function SceneSelect() {
  const { setScreen } = useGameStore();
  const globalAchievements = getGlobalAchievements();
  const visitedScenes = getVisitedScenes();
  const availableScenes = getAvailableScenes(globalAchievements);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleSelectScene = (sceneId: SceneType) => {
    sessionStorage.setItem('temp_scene', sceneId);
    setScreen('system_select');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <MangaTitle as="h2" className="text-center mb-2">选择重生场景</MangaTitle>
        <p className="text-game-text-muted text-center mb-6">每个场景都有独特的规则和难度</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENES.map((scene, index) => {
            const isUnlocked = availableScenes.some((s) => s.id === scene.id);
            const isVisited = visitedScenes.includes(scene.id);

            return (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                {isUnlocked ? (
                  <MangaPanel
                    screentone={isVisited ? '10' : undefined}
                    className="cursor-pointer h-full"
                  >
                    <div onClick={() => handleSelectScene(scene.id)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" style={{ color: '#1a1a1a' }} />
                          <h3 className="text-lg font-bold">{scene.name}</h3>
                        </div>
                        <span className="manga-badge">
                          {difficultyLabels[scene.difficulty] || '中等'}
                        </span>
                      </div>

                      <p className="text-sm text-game-text-muted mb-3">{scene.description}</p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {scene.specialRules.map((rule, i) => (
                          <span key={i} className="text-xs ink-border px-2 py-1 bg-white">
                            {rule}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-game-text-muted">
                        <span>寿命上限: {scene.maxAge}岁</span>
                        {isVisited && <span className="font-bold" style={{ color: '#27ae60' }}>已体验</span>}
                      </div>
                    </div>
                  </MangaPanel>
                ) : (
                  <MangaPanel screentone="cross" className="opacity-50 h-full">
                    <div className="flex flex-col items-center justify-center h-full py-4">
                      <Lock className="w-8 h-8 text-game-text-muted mb-2" />
                      <p className="text-sm text-game-text-muted font-bold">???</p>
                      <p className="text-xs text-game-text-muted mt-1">完成特定成就后解锁</p>
                    </div>
                  </MangaPanel>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <motion.button
            onClick={() => setScreen('create')}
            className="manga-btn-outline flex items-center gap-2 mx-auto"
            whileTap={{ scale: 0.97 }}
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            返回
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
