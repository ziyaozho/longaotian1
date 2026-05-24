import type { Player, Task } from '../types';

// ============================================================
// 系统智能体历史记录 —— §8 防幻觉
// ============================================================

export interface SystemHistory {
  checkInStreak: number;
  totalCheckIns: number;
  lastRewardItems: string[];     // 最近发放的道具名称（用于去重）
  lastRewardIds: string[];       // 最近发放的道具ID
  rewardFrequency: Record<string, number>; // 各品质发放次数统计
  lastTriggerRound: number;      // 上次触发的回合
  economicBalance: {
    totalWealthGiven: number;
    wealthIncomeRate: '较低' | '中等' | '较高';
    expectedSinks: string[];
  };
}

/**
 * 创建初始系统历史
 */
export function createInitialSystemHistory(): SystemHistory {
  return {
    checkInStreak: 0,
    totalCheckIns: 0,
    lastRewardItems: [],
    lastRewardIds: [],
    rewardFrequency: {},
    lastTriggerRound: 0,
    economicBalance: {
      totalWealthGiven: 0,
      wealthIncomeRate: '较低',
      expectedSinks: ['商人', '黑市'],
    },
  };
}

/**
 * 记录奖励发放
 */
export function recordReward(
  history: SystemHistory,
  itemName: string,
  itemId: string,
  wealthAmount: number
): SystemHistory {
  const newTotal = history.economicBalance.totalWealthGiven + wealthAmount;
  return {
    ...history,
    lastRewardItems: [...history.lastRewardItems.slice(-9), itemName],
    lastRewardIds: [...history.lastRewardIds.slice(-9), itemId],
    rewardFrequency: {
      ...history.rewardFrequency,
      [itemId]: (history.rewardFrequency[itemId] || 0) + 1,
    },
    economicBalance: {
      ...history.economicBalance,
      totalWealthGiven: newTotal,
      wealthIncomeRate: newTotal > 5000 ? '较高' : newTotal > 2000 ? '中等' : '较低',
    },
  };
}

/**
 * 检查道具是否与近期奖励重复
 */
export function isRewardDuplicate(history: SystemHistory, itemId: string): boolean {
  return history.lastRewardIds.includes(itemId);
}

/**
 * 根据签到天数决定奖励品质
 */
export function getRewardQualityForStreak(streak: number): 'common' | 'rare' | 'epic' | 'legendary' {
  if (streak >= 15) return 'legendary';
  if (streak >= 7) return 'legendary';
  if (streak >= 3) return 'epic';
  if (streak >= 2) return 'rare';
  return 'common';
}

/**
 * 根据品质计算金钱奖励
 */
export function getWealthForQuality(quality: string, streak: number): number {
  const base = { common: 50, rare: 100, epic: 200, legendary: 300 };
  const bonus = streak * 10;
  return (base[quality as keyof typeof base] || 50) + bonus;
}

/**
 * 构建系统状态快照（用于 AI prompt）
 */
export function buildSystemStateSnapshot(
  history: SystemHistory,
  player: Player
): string {
  return `签到连续天数：${history.checkInStreak}
进行中任务：${player.activeTasks.map((t) => `${t.name}（进度${t.progress}/${t.targetValue}）`).join('；') || '无'}
近期发放道具：${history.lastRewardItems.join('、') || '无'}
金钱收入率：${history.economicBalance.wealthIncomeRate}
预期消费途径：${history.economicBalance.expectedSinks.join('、')}`;
}
