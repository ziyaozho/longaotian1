import type { Player, Task, Item } from '../types';
import type { SystemHistory } from '../engine/systemHistory';
import {
  recordReward, isRewardDuplicate,
  getRewardQualityForStreak, getWealthForQuality,
} from '../engine/systemHistory';
import { LEGENDARY_ARTIFACTS, type Artifact } from '../data/artifacts';
import { selectMemesForStyle } from '../data/memes';
import { generateSystemDialogue, buildPersonaInput } from './personaActor';
import { DEEPSEEK_API_KEY } from '../ai';

// ============================================================
// 天道系统使 (System Agent) —— 系统agent设计.txt
// 职责：签到/任务/奖励发放/系统对话
// ============================================================

/** 触发原因 */
type TriggerReason = 'daily_check_in' | 'task_update' | 'manual_trigger';

/** 系统智能体输入 */
export interface SystemAgentInput {
  triggerReason: TriggerReason;
  systemType: string;
  personality: string;
  player: Player;
  systemHistory: SystemHistory;
  memeHints: string[];
  storyPhase: 'early' | 'mid' | 'late' | 'ending';
}

/** 奖励条目 */
export interface RewardEntry {
  type: 'item' | 'wealth' | 'artifact' | 'attribute';
  itemId?: string;
  name?: string;
  quality?: string;
  description?: string;
  amount?: number;
  storyHook?: string;
  priceHint?: number | null;
}

/** 任务更新 */
export interface TaskUpdate {
  taskId: string;
  newProgress: string;
  completionTriggered: boolean;
}

/** 系统智能体输出 */
export interface SystemAgentOutput {
  systemDialogue: string;
  rewards: RewardEntry[];
  taskUpdates: TaskUpdate[];
  newTasks: Partial<Task>[];
  systemNotes: string;
}

// ============================================================
// 本地逻辑引擎（非AI，确定性规则）
// ============================================================

/**
 * 处理每日签到（本地规则引擎）
 */
export async function processCheckInAsync(
  player: Player,
  history: SystemHistory,
  streak: number
): Promise<SystemAgentOutput> {
  const quality = getRewardQualityForStreak(streak);
  const wealth = getWealthForQuality(quality, streak);

  const output: SystemAgentOutput = {
    systemDialogue: '',
    rewards: [],
    taskUpdates: [],
    newTasks: [],
    systemNotes: '',
  };

  // 金钱奖励
  output.rewards.push({ type: 'wealth', amount: wealth });

  // 传说品质：从逆天道具库发放
  if (quality === 'legendary' && streak >= 7) {
    const ownedIds = player.inventory.map((i) => i.id);
    const available = LEGENDARY_ARTIFACTS.filter(
      (a) => !ownedIds.includes(a.id) && !isRewardDuplicate(history, a.id)
    );

    if (available.length > 0) {
      const artifact = available[Math.floor(Math.random() * available.length)];
      output.rewards.push({
        type: 'artifact',
        itemId: artifact.id,
        name: artifact.name,
        quality: '传说',
        description: artifact.description,
        storyHook: artifact.storyHook,
        priceHint: artifact.rarity === 'legendary' ? 1000 : 500,
      });

      // 发布配套任务
      output.newTasks.push({
        name: `${artifact.name}的初次使用`,
        description: `使用${artifact.name}并发挥其力量，证明你是天选之人。`,
        type: 'side',
        difficulty: 3,
        targetType: 'explore',
        targetValue: 1,
        targetRounds: 5,
        reward: { exp: 200, wealth: 500 },
      });

      // AI 生成传说庆祝对话
      const aiPersonaInput = buildPersonaInput({
        player,
        sceneContext: `连续签到第${streak}天`,
        eventSummary: `获得传说级道具${artifact.name}`,
      });
      output.systemDialogue = await generateSystemDialogue({
        ...aiPersonaInput,
        itemName: artifact.name,
        streak,
      });
      output.systemNotes = `发放传说道具${artifact.name}，记忆守护者需标记"待使用"`;
    } else {
      const aiInput = buildPersonaInput({
        player,
        sceneContext: `连续签到第${streak}天`,
        eventSummary: `签到奖励¥${wealth.toLocaleString()}，宝库已空`,
      });
      output.systemDialogue = await generateSystemDialogue({ ...aiInput, streak });
    }
  } else {
    const aiInput = buildPersonaInput({
      player,
      sceneContext: `第${streak}天签到`,
      eventSummary: `签到奖励¥${wealth.toLocaleString()}`,
    });
    output.systemDialogue = await generateSystemDialogue({ ...aiInput, streak });
  }

  return output;
}

/**
 * 处理任务更新（本地逻辑）
 */
export function processTaskUpdate(
  _player: Player,
  _history: SystemHistory,
  activeTasks: Task[],
  completedTaskId?: string
): SystemAgentOutput {
  const output: SystemAgentOutput = {
    systemDialogue: '叮！系统运行正常。',
    rewards: [],
    taskUpdates: [],
    newTasks: [],
    systemNotes: '',
  };

  if (completedTaskId) {
    const task = activeTasks.find((t) => t.id === completedTaskId);
    if (task) {
      const rewardGold = task.reward?.wealth || 50;
      const rewardExp = task.reward?.exp || 100;

      output.taskUpdates.push({
        taskId: completedTaskId,
        newProgress: '已完成',
        completionTriggered: true,
      });

      output.rewards.push(
        { type: 'wealth', amount: rewardGold },
        { type: 'attribute', amount: rewardExp, name: '经验' }
      );

      output.systemDialogue = `叮！任务【${task.name}】完成！获得${rewardExp}经验和${rewardGold}金币。宿主，干得不错——虽然大部分功劳归系统。`;
    }
  }

  return output;
}

// ============================================================
// AI 增强（可选，用于生成更生动的系统对话）
// ============================================================

/**
 * AI 生成系统响应
 */
export async function generateSystemResponseAI(
  input: SystemAgentInput
): Promise<string> {
  const { triggerReason, systemType, personality, player, systemHistory, memeHints, storyPhase } = input;

  const attrSummary = Object.entries(player.attributes)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  const prompt = `你是"天道系统使"，运行于系统流游戏中的AI系统精灵。模拟${systemType}的行为。

【系统设定】
- 系统类型：${systemType}
- 性格：${personality}
- 游戏阶段：${storyPhase}
- 玩家属性：${attrSummary}
- 持有金钱：¥${player.stats.wealth}
- 签到连续天数：${systemHistory.checkInStreak}
- 近期发放道具：${systemHistory.lastRewardItems.join('、') || '无'}
- 可用热梗：${memeHints.join('、')}

【触发事件】${triggerReason}

请生成一句符合性格的系统发言（50字以内，以"叮！"开头）。严格遵循性格，融入当前场景。输出纯文本。`;

  if (!DEEPSEEK_API_KEY) return '';

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) return '';
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch {
    return '';
  }
}

// ============================================================
// 主入口
// ============================================================

/**
 * 系统智能体主函数
 * 引擎在每回合开始时调用此函数处理签到和任务
 */
export async function processSystemTurn(
  player: Player,
  history: SystemHistory,
  trigger: TriggerReason = 'daily_check_in'
): Promise<SystemAgentOutput> {
  switch (trigger) {
    case 'daily_check_in': {
      const newStreak = history.checkInStreak + 1;
      const output = await processCheckInAsync(player, history, newStreak);

      output.systemNotes = (output.systemNotes
        ? output.systemNotes + ' | '
        : '') + `check_in_streak:${newStreak}`;

      return output;
    }

    case 'task_update': {
      const completable = player.activeTasks.find(
        (t) => t.progress >= t.targetValue && !t.completed
      );
      return processTaskUpdate(player, history, player.activeTasks, completable?.id);
    }

    case 'manual_trigger': {
      const aiInput = buildPersonaInput({
        player,
        sceneContext: '系统待命',
        eventSummary: '宿主手动触发',
      });
      const msg = await generateSystemDialogue(aiInput);
      return {
        systemDialogue: msg,
        rewards: [],
        taskUpdates: [],
        newTasks: [],
        systemNotes: '',
      };
    }

    default:
      return {
        systemDialogue: '叮！系统运行正常。',
        rewards: [],
        taskUpdates: [],
        newTasks: [],
        systemNotes: '',
      };
  }
}

/**
 * 确定当前游戏阶段
 */
export function determineStoryPhase(player: Player): 'early' | 'mid' | 'late' | 'ending' {
  const round = player.progress.round;
  const level = player.stats.level;

  if (player.endingProgress.isFailed) return 'ending';
  if (level >= 50 || round >= 80) return 'late';
  if (level >= 15 || round >= 30) return 'mid';
  return 'early';
}
