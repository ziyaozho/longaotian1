import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { getSaveSlots, loadSave, deleteSave, migrateFromLocalStorage, type SaveSlot } from '../../utils/database';
import { getGlobalAchievements } from '../../utils/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BookOpen, Trophy, RotateCcw, Trash2, Clock, MapPin, Star } from 'lucide-react';
import { MangaPanel, MangaTitle, Screentone } from '../manga';

export default function StartScreen() {
  const { setScreen } = useGameStore();
  const { setPlayer } = usePlayerStore();

  const [showSaves, setShowSaves] = useState(false);
  const [slots, setSlots] = useState<Omit<SaveSlot, 'data'>[]>([]);
  const [hasSaves, setHasSaves] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    // 迁移旧数据 + 加载存档列表
    (async () => {
      await migrateFromLocalStorage();
      const list = await getSaveSlots();
      setSlots(list);
      setHasSaves(list.length > 0);
    })();
  }, []);

  const handleNewGame = () => setScreen('create');

  const handleOpenSaves = async () => {
    const list = await getSaveSlots();
    setSlots(list);
    setShowSaves(true);
  };

  const handleLoadSave = async (saveId: string) => {
    setLoading(true);
    const slot = await loadSave(saveId);
    if (slot) {
      const { migratePlayerData } = await import('../../utils/storage');
      setPlayer(migratePlayerData(slot.data));
      setShowSaves(false);
      setScreen('game');
    }
    setLoading(false);
  };

  const handleDeleteSave = async (saveId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSave(saveId);
    const list = await getSaveSlots();
    setSlots(list);
    setHasSaves(list.length > 0);
  };

  const globalAchievements = getGlobalAchievements();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 paper-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <MangaPanel pageNumber={1} className="max-w-lg mx-auto">
          <MangaTitle as="h1" shake>
            人生重开模拟器
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

            {hasSaves && (
              <motion.button
                onClick={handleOpenSaves}
                className="manga-btn-outline flex items-center gap-2 w-full justify-center"
                whileTap={{ scale: 0.97 }}
              >
                <RotateCcw className="w-5 h-5" />
                继续游戏 ({slots.length})
              </motion.button>
            )}

            <motion.button
              onClick={() => setScreen('achievements')}
              className="manga-btn-outline flex items-center gap-2 w-full justify-center"
              whileTap={{ scale: 0.97 }}
            >
              <Trophy className="w-5 h-5" />
              成就墙 ({globalAchievements.length})
            </motion.button>
          </div>
        </MangaPanel>

        <div className="mt-8 flex items-center justify-center gap-6 text-game-text-muted text-xs">
          <div className="flex items-center gap-1"><BookOpen className="w-4 h-4" /><span>5个基础场景</span></div>
          <span className="text-game-text-muted/30">·</span>
          <div className="flex items-center gap-1"><span>10+系统可选</span></div>
          <span className="text-game-text-muted/30">·</span>
          <div className="flex items-center gap-1"><Trophy className="w-4 h-4" /><span>30+成就待解锁</span></div>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* 存档选择弹窗 */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showSaves && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowSaves(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <MangaPanel className="!p-5">
                <h2 className="text-lg font-bold mb-1 manga-title">选择存档</h2>
                <p className="text-xs text-game-text-muted mb-4">
                  {slots.length} 个存档 · 数据存储在本地浏览器数据库
                </p>

                {loading && (
                  <div className="text-center py-8 text-game-text-muted">加载中...</div>
                )}

                {!loading && slots.length === 0 && (
                  <div className="text-center py-8 text-game-text-muted">
                    <p>没有存档</p>
                    <button
                      onClick={() => { setShowSaves(false); handleNewGame(); }}
                      className="manga-btn text-sm mt-3 px-4 py-1.5"
                    >
                      创建新游戏
                    </button>
                  </div>
                )}

                {!loading && slots.length > 0 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {slots.map((slot) => (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ink-border p-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between group"
                        onClick={() => handleLoadSave(slot.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm truncate">{slot.playerName}</span>
                            <span className="manga-badge text-[10px]">Lv.{slot.level}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-game-text-muted">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {slot.sceneName}
                            </span>
                            <span>第{slot.round}回合</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(slot.updatedAt).toLocaleString('zh-CN', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteSave(slot.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded"
                          title="删除存档"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: '#c0392b' }} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowSaves(false)}
                  className="manga-btn-outline text-sm w-full mt-4 py-1.5"
                >
                  关闭
                </button>
              </MangaPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
