import type { StoryMemory } from '../types';
import { getProvider } from '../ai';
import { DEEPSEEK_API_KEY } from '../ai';

// ============================================================
// 常量配置
// ============================================================

/** 触发压缩的近期事件阈值 */
const COMPRESSION_THRESHOLD = 8;
/** 压缩后保留的近期事件数量 */
const KEEP_AFTER_COMPRESSION = 3;
/** 长期摘要最大字符数 */
const MAX_SUMMARY_LENGTH = 500;

// ============================================================
// 主入口
// ============================================================

/**
 * 每回合结束时调用，处理记忆更新和压缩
 * @returns 更新后的 StoryMemory
 */
export async function processMemoryAfterTurn(
  storyMemory: StoryMemory,
  currentRound: number,
  newEvent: string,
  newDecision?: { choice: string; result: string },
  useAI: boolean = true
): Promise<StoryMemory> {
  // 1. 添加新事件
  let updated = addEvent(storyMemory, currentRound, newEvent);

  // 2. 记录决策
  if (newDecision) {
    updated = addDecision(updated, currentRound, newDecision.choice, newDecision.result);
  }

  // 3. 检查是否需要压缩
  if (updated.recentEvents.length >= COMPRESSION_THRESHOLD) {
    return await compressRecentEvents(updated, useAI);
  }

  return updated;
}

// ============================================================
// 纯函数操作
// ============================================================

/**
 * 添加新事件到近期事件列表
 */
export function addEvent(
  memory: StoryMemory,
  round: number,
  event: string
): StoryMemory {
  return {
    ...memory,
    recentEvents: [...memory.recentEvents, { round, event }],
  };
}

/**
 * 添加决策到决策日志
 */
export function addDecision(
  memory: StoryMemory,
  round: number,
  choice: string,
  result: string
): StoryMemory {
  return {
    ...memory,
    decisionLog: [...memory.decisionLog, { round, choice, result }],
  };
}

// ============================================================
// 压缩逻辑
// ============================================================

/**
 * 压缩近期事件到长期摘要
 */
export async function compressRecentEvents(
  memory: StoryMemory,
  useAI: boolean = true
): Promise<StoryMemory> {
  const eventsToCompress = memory.recentEvents.slice(0, -KEEP_AFTER_COMPRESSION);
  const keepEvents = memory.recentEvents.slice(-KEEP_AFTER_COMPRESSION);

  if (eventsToCompress.length === 0) {
    return memory;
  }

  let summaryDelta: string;

  if (useAI) {
    // 用户要求必须用 API，不降级
    summaryDelta = await summarizeEventsWithAI(eventsToCompress);
  } else {
    summaryDelta = fallbackSummarize(eventsToCompress);
  }

  // 追加到长期摘要
  const newLongTerm = memory.longTermSummary
    ? `${memory.longTermSummary} ${summaryDelta}`
    : summaryDelta;

  // 限制长度
  const trimmedLongTerm = trimLongTermSummary(newLongTerm, MAX_SUMMARY_LENGTH);

  return {
    ...memory,
    longTermSummary: trimmedLongTerm,
    recentEvents: keepEvents,
  };
}

// ============================================================
// AI 摘要
// ============================================================

/**
 * 调用 AI 将事件压缩为剧情摘要
 */
export async function summarizeEventsWithAI(
  events: Array<{ round: number; event: string }>
): Promise<string> {
  const provider = getProvider();

  const eventsText = events.map((e) => `第${e.round}回合：${e.event}`).join('\n');

  const prompt =
    `将以下游戏事件压缩为一句连贯的剧情摘要（100字以内），保留关键信息和因果关系：\n\n` +
    eventsText;

  const response = await provider.generateScene({
    player: {
      name: '',
      attributes: { talent: 0, appearance: 0, intelligence: 0, physique: 0, family: 0, luck: 0 },
      stats: { level: 1, exp: 0, hp: 100, maxHp: 100, mp: 50, maxMp: 50, combatPower: 0, wealth: 0, fame: 0 },
      system: { id: '', name: '', level: 1, exp: 0, features: [] },
      progress: { sceneType: 'modern_city', sceneLevel: 1, round: 1, age: 16, storyFlags: [] },
      inventory: [],
      equipment: {},
      skills: [],
      activeTasks: [],
      completedTasks: [],
      achievements: [],
      history: [],
      talents: [],
      npcs: [],
      relationships: {},
      storyMemory: { longTermSummary: '', recentEvents: [], decisionLog: [] },
      worldState: { currentLocation: '', timeline: '', globalFlags: {} },
      extendedSystem: { dialogueStyle: '' },
      endingProgress: { targetEndingId: '', conditionStatus: {}, isFailed: false },
    },
    sceneType: 'modern_city',
    sceneName: '摘要生成',
    round: 0,
    age: 0,
    history: [],
  });

  // 使用生成的场景文本作为摘要（简化处理）
  // 实际上应该使用 provider 的底层 generate 方法，但 provider 接口没有暴露
  // 这里使用一个简化的方法：直接构建 prompt 调用 fetch
  return await callSummaryAPI(eventsText);
}

/**
 * 直接调用 AI API 进行摘要（绕过 provider 接口限制）
 */
async function callSummaryAPI(eventsText: string): Promise<string> {
  try {
    if (typeof DEEPSEEK_API_KEY === 'undefined') {
      throw new Error('No API key');
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个剧情摘要助手。将游戏事件压缩为一句连贯的剧情摘要，100字以内，保留关键信息和因果关系。只输出摘要文本，不要其他内容。',
          },
          {
            role: 'user',
            content: `将以下事件压缩为一句剧情摘要：\n\n${eventsText}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // 清理可能的引号或多余格式
    return content.replace(/^["']|["']$/g, '').trim();
  } catch (e) {
    console.warn('摘要 API 调用失败:', e);
    throw e;
  }
}

// ============================================================
// 降级方案
// ============================================================

/**
 * AI 不可用时，使用本地模板进行简单拼接摘要
 */
export function fallbackSummarize(
  events: Array<{ round: number; event: string }>
): string {
  if (events.length === 0) return '';
  if (events.length === 1) return events[0].event;

  const first = events[0];
  const last = events[events.length - 1];

  // 简单拼接：首事件 + 发展过程 + 尾事件
  return `${first.event}...（经历${events.length}回合）...${last.event}`;
}

/**
 * 限制长期摘要长度
 */
export function trimLongTermSummary(summary: string, maxChars: number): string {
  if (summary.length <= maxChars) return summary;

  // 保留开头和结尾，中间用省略号
  const half = Math.floor(maxChars / 2) - 5;
  return summary.slice(0, half) + ' ... ' + summary.slice(-half);
}

// ============================================================
// 关键事件提取
// ============================================================

/** 回合效果结构（避免循环导入） */
interface TurnEffects {
  hpChange: number;
  mpChange: number;
  expGain: number;
  wealthChange: number;
  fameChange: number;
  systemExpGain: number;
}

/**
 * 从回合结果中提取关键事件描述
 * 不是所有回合都值得详细记录，只提取有意义的操作
 */
export function extractKeyEvent(
  turnResult: {
    effects: TurnEffects;
    droppedItems?: Array<{ rarity: string; name: string }>;
    newTasks?: Array<{ name: string }>;
    newAchievements?: string[];
    combatResult?: { isVictory: boolean; enemyName: string } | null;
  },
  _player: { stats: { hp: number; maxHp: number }; inventory: Array<{ rarity: string; name: string }> }
): string | null {
  const events: string[] = [];

  // 重大属性变化
  if (turnResult.effects.hpChange < -20) {
    events.push(`遭受重创，生命值减少${Math.abs(turnResult.effects.hpChange)}`);
  }
  if (turnResult.effects.expGain > 50) {
    events.push(`获得大量经验，实力显著提升`);
  }

  // 获得稀有物品
  if (turnResult.droppedItems?.length > 0) {
    const rareItems = turnResult.droppedItems.filter(
      (i) => i.rarity === 'epic' || i.rarity === 'legendary'
    );
    if (rareItems.length > 0) {
      events.push(`获得稀有物品：${rareItems.map((i) => i.name).join('、')}`);
    }
  }

  // 新任务
  if (turnResult.newTasks?.length > 0) {
    events.push(`接受新任务：${turnResult.newTasks[0].name}`);
  }

  // 新成就
  if (turnResult.newAchievements?.length > 0) {
    events.push(`解锁成就`);
  }

  // 战斗结果
  if (turnResult.combatResult) {
    const { isVictory, enemyName } = turnResult.combatResult;
    events.push(isVictory ? `战胜${enemyName}` : `被${enemyName}击败`);
  }

  // 合并为一句
  if (events.length === 0) return null;
  if (events.length === 1) return events[0];
  return events.join('；');
}
