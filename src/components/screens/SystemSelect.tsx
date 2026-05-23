import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { SYSTEMS, getAvailableSystems } from '../../data/systems';
import { getGlobalAchievements } from '../../utils/storage';
import { createInitialPlayer } from '../../store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ArrowRight, Lock } from 'lucide-react';
import { MangaPanel, MangaTitle } from '../manga';

const rarityLabels: Record<string, string> = {
  common: '普通', rare: '稀有', epic: '史诗', legendary: '传说', hidden: '隐藏',
};

export default function SystemSelect() {
  const { setScreen } = useGameStore();
  const { setPlayer } = usePlayerStore();
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const globalAchievements = getGlobalAchievements();
  const availableSystems = getAvailableSystems(globalAchievements);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const name = sessionStorage.getItem('temp_name') || '无名';
  const attributesStr = sessionStorage.getItem('temp_attributes');
  const attributes = attributesStr ? JSON.parse(attributesStr) : {};
  const sceneType = sessionStorage.getItem('temp_scene') || 'modern_city';

  const handleConfirm = () => {
    if (!selectedSystem) return;
    const sys = SYSTEMS.find((s) => s.id === selectedSystem);
    if (!sys) return;

    const player = createInitialPlayer(name, attributes, sceneType, sys.id, sys.name);
    setPlayer(player);
    setScreen('game');
  };

  const selectedSys = SYSTEMS.find((s) => s.id === selectedSystem);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <MangaTitle as="h2" className="text-center mb-2">选择绑定系统</MangaTitle>
        <p className="text-game-text-muted text-center mb-6">系统将伴随你成长，慎重选择</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {SYSTEMS.map((system, index) => {
            const isUnlocked = availableSystems.some((s) => s.id === system.id);
            const isSelected = selectedSystem === system.id;

            return (
              <motion.div
                key={system.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {isUnlocked ? (
                  <MangaPanel
                    pageNumber={index + 1}
                    className={`cursor-pointer h-full ${isSelected ? 'ring-3 ring-game-accent' : ''}`}
                  >
                    <div onClick={() => setSelectedSystem(system.id)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5" style={{ color: '#1a1a1a' }} />
                          <h3 className="text-lg font-bold">{system.name}</h3>
                        </div>
                        <span className="manga-badge">{rarityLabels[system.rarity] || system.rarity}</span>
                      </div>

                      <p className="text-sm text-game-text-muted mb-3">{system.description}</p>

                      <div className="text-xs text-game-text-muted">
                        <div>性格: {system.personality}</div>
                        <div className="mt-1 italic">"{system.catchphrase}"</div>
                      </div>

                      <div className="mt-3 text-xs font-bold" style={{ color: '#d4a017' }}>
                        最高{system.maxLevel}级
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

        {/* Selected system details */}
        <AnimatePresence>
          {selectedSys && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <MangaPanel>
                <h4 className="font-bold mb-3 manga-title">升级路线</h4>
                <div className="space-y-3">
                  {selectedSys.upgrades.map((upgrade) => (
                    <div
                      key={upgrade.level}
                      className="flex items-center gap-3 text-sm ink-border p-2 bg-white"
                    >
                      <span className="text-xs font-bold manga-badge">Lv.{upgrade.level}</span>
                      <span className="font-bold" style={{ color: '#1a1a1a' }}>{upgrade.name}</span>
                      <span className="text-game-text-muted text-xs">- {upgrade.description}</span>
                    </div>
                  ))}
                </div>
              </MangaPanel>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-3">
          <motion.button
            onClick={() => setScreen('scene_select')}
            className="manga-btn-outline flex items-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            返回
          </motion.button>
          <motion.button
            onClick={handleConfirm}
            disabled={!selectedSystem}
            className="manga-btn flex items-center gap-2 disabled:opacity-40"
            whileTap={selectedSystem ? { scale: 0.97 } : {}}
          >
            开始重生
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
