import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { getSceneById } from '../../data/scenes';
import { getAchievementById } from '../../data/achievements';
import { calculateEndingGrade, buildEndingReviewPrompt } from '../../engine/endingTracker';
import { getEndingById } from '../../data/endings';
import { motion } from 'framer-motion';
import { RotateCcw, Trophy, Home, Star, Clock, Swords, Coins, BookOpen, Heart, Users } from 'lucide-react';
import { MangaPanel, MangaTitle } from '../manga';

export default function GameOver() {
  const { setScreen, resetGame } = useGameStore();
  const { player, resetPlayer } = usePlayerStore();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!player) return null;

  const scene = getSceneById(player.progress.sceneType);

  const handleRestart = () => {
    setScreen('create');
    // 延迟重置避免渲染期间 player 为 null 触发副作用
    setTimeout(() => {
      resetPlayer();
      resetGame();
    }, 0);
  };

  const handleHome = () => {
    setScreen('start');
    setTimeout(() => {
      resetPlayer();
      resetGame();
    }, 0);
  };

  // ending.md.txt: 使用新的结局评分算法
  const endingGrade = calculateEndingGrade(player);
  const gradeConfig = {
    S: { label: 'S', color: '#d4a017', desc: '传说' },
    A: { label: 'A', color: '#8e44ad', desc: '史诗' },
    B: { label: 'B', color: '#2980b9', desc: '优秀' },
    C: { label: 'C', color: '#27ae60', desc: '良好' },
    D: { label: 'D', color: '#888888', desc: '普通' },
  }[endingGrade];

  const rating = gradeConfig;

  // 计算结局完成度
  const ending = getEndingById(player.endingProgress.targetEndingId);
  const completedConditions = ending
    ? ending.victoryConditions.filter((c) => player.endingProgress.conditionStatus[c] === true).length
    : 0;
  const totalConditions = ending ? ending.victoryConditions.length : 0;

  // ending.md.txt: 结局回顾文本
  const getEndingReview = (): string => {
    const decisions = player.storyMemory.decisionLog;
    const ending = player.endingProgress.targetEndingId;
    const endingName = ending
      ? {
          ending_modern_king: '都市之王',
          ending_immortal_hermit: '隐世丹神',
          ending_urban_legend: '都市传说',
          ending_apocalypse_savior: '末世救主',
          ending_apoc_fantasy_rider: '天启骑士',
          ending_hidden_immortal: '仙道独尊',
          ending_cyber_god: '数据飞升',
          ending_demon_overlord: '魔神降世',
        }[ending] || '未知结局'
      : '平凡一生';

    if (decisions.length === 0) {
      return `${player.name}的旅程平淡无奇，没有留下太多值得铭记的故事。`;
    }

    const keyDecisions = [
      ...decisions.slice(0, 2),
      ...decisions.slice(-2),
    ];

    return `${player.name}的一生充满了抉择。` +
      keyDecisions.map((d) => `第${d.round}回合，${d.choice}，${d.result}。`).join('') +
      `最终，${player.name}迎来了属于自己的结局——${endingName}。`;
  };

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
            评级: {rating?.desc} · 结局完成度: {completedConditions}/{totalConditions}
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

        {/* ending.md.txt: 结局回顾 */}
        {player.storyMemory.decisionLog.length > 0 && (
          <MangaPanel className="mb-6">
            <h3 className="text-lg font-bold mb-4 text-center manga-title">结局回顾</h3>
            <p className="text-sm text-game-text leading-relaxed italic px-4">
              {getEndingReview()}
            </p>
          </MangaPanel>
        )}

        {/* ending.md.txt: 决策时间线 */}
        {player.storyMemory.decisionLog.length > 0 && (
          <MangaPanel className="mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2 manga-title">
              <BookOpen className="w-4 h-4" style={{ color: '#2980b9' }} />
              决策时间线
            </h3>
            <div className="space-y-2">
              {player.storyMemory.decisionLog.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-game-accent" />
                    {i < player.storyMemory.decisionLog.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-300 min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-3">
                    <span className="text-[10px] text-gray-400">第{d.round}回合</span>
                    <p className="text-xs font-medium">{d.choice}</p>
                    <p className="text-[10px] text-gray-500">{d.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </MangaPanel>
        )}

        {/* ending.md.txt: NPC 最终关系 */}
        {player.npcs.length > 0 && (
          <MangaPanel className="mb-6">
            <h3 className="font-bold mb-4 flex items-center gap-2 manga-title">
              <Users className="w-4 h-4" style={{ color: '#8e44ad' }} />
              NPC 最终关系
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {player.npcs.map((npc) => (
                <div key={npc.npcId} className="ink-border p-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{npc.name}</span>
                    {npc.isAlive ? (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded text-white"
                        style={{
                          backgroundColor:
                            npc.relationship >= 80 ? '#e74c3c'
                            : npc.relationship >= 50 ? '#f39c12'
                            : npc.relationship >= 10 ? '#27ae60'
                            : npc.relationship >= -10 ? '#7f8c8d'
                            : npc.relationship >= -50 ? '#2980b9'
                            : '#8e44ad',
                        }}
                      >
                        {npc.relationship >= 80 ? '羁绊'
                          : npc.relationship >= 50 ? '亲近'
                          : npc.relationship >= 10 ? '友善'
                          : npc.relationship >= -10 ? '中立'
                          : npc.relationship >= -50 ? '冷淡'
                          : '敌对'}{' '}
                        {npc.relationship}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">已离世</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{npc.role}</p>
                </div>
              ))}
            </div>
          </MangaPanel>
        )}

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
