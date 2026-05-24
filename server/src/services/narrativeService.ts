/**
 * ============================================================
 * 《万界行者》叙事触发服务层
 * ============================================================
 *
 * 职责：
 * 1. 将游戏事件（签到、升级、进入副本等）转换为叙事内容
 * 2. 根据玩家进度自动推进主线剧情节点
 * 3. 管理对话变量的动态替换（{playerName} → 实际值）
 * 4. 提供简洁的 API 供游戏逻辑调用
 *
 * 设计原则：
 * - 这个服务是"无状态"的，所有状态存在 narrativeStore 中
 * - 只读取 playerStore 和 narrativeStore，不直接写入（通过 store API 写入）
 * - 所有叙事触发都是"建议式"的，调用方决定是否在合适时机展示
 */

import {
  ALL_SYSTEM_DIALOGUE,
  STORY_CRITICAL_DIALOGUE,
  getSystemPhase,
  getDialogueByTrigger,
  getSceneArcById,
  type SystemPhase,
  type SystemDialogueLine,
  type SystemDialogueCategory,
  type StoryNode,
} from '../narrative';
import {
  useNarrativeStore,
  type DialogueEntry,
} from '../store/narrativeStore';
import type { Player, SceneType } from '../types';

// ------------------------------------------------------------------
// 类型定义
// ------------------------------------------------------------------

/** 触发系统对话时的上下文变量 */
export interface DialogueContext {
  /** 玩家名称 */
  playerName?: string;
  /** 当前世界名称 */
  worldName?: string;
  /** 连续签到天数 */
  streak?: number;
  /** 任务名称 */
  taskName?: string;
  /** 奖励名称 */
  reward?: string;
  /** 物品名称 */
  itemName?: string;
  /** 概率百分比 */
  probability?: number;
  /** 副本难度 */
  difficulty?: string;
  /** 副本评价 */
  rating?: string;
  /** 当前货币 */
  currency?: number;
  /** 配方名称 */
  recipeName?: string;
  /** 成功率 */
  successRate?: number;
  /** 品质 */
  quality?: string;
  /** 宠物名称 */
  petName?: string;
  /** 潜力等级 */
  potential?: string;
  /** 技能名称 */
  skillName?: string;
  /** 属性文本 */
  stats?: string;
  /** NPC名称 */
  npcName?: string;
  [key: string]: string | number | undefined;
}

/** 剧情进度检查上下文 */
export interface StoryProgressContext {
  /** 当前世界ID */
  currentWorldId: SceneType;
  /** 当前世界等级/进度 */
  sceneLevel: number;
  /** 总回合数 */
  round: number;
  /** 已收集的本源数量（即已完成的世界数） */
  essencesCollected: number;
  /** 已完成的剧情节点ID集合 */
  completedNodeIds: Set<string>;
  /** 已触发的 storyFlags */
  storyFlags: string[];
}

// ------------------------------------------------------------------
// 常量
// ------------------------------------------------------------------

/** 系统对话类别到内部键名的映射 */
const CATEGORY_MAP: Record<string, SystemDialogueCategory> = {
  signIn: 'signIn',
  statusPanel: 'statusPanel',
  taskSystem: 'taskSystem',
  lottery: 'lottery',
  copySystem: 'copySystem',
  shop: 'shop',
  alchemy: 'alchemy',
  petSystem: 'petSystem',
  devourSystem: 'devourSystem',
  timeSystem: 'timeSystem',
};

// ------------------------------------------------------------------
// 变量替换引擎
// ------------------------------------------------------------------

/**
 * 将模板字符串中的 {变量名} 替换为实际值
 */
export function resolveVariables(
  template: string,
  context: DialogueContext
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = context[key];
    if (value === undefined) {
      // 未定义的变量保留原样，便于调试
      console.warn(`[NarrativeService] 未定义的变量: ${key}`);
      return match;
    }
    return String(value);
  });
}

// ------------------------------------------------------------------
// 系统对话触发
// ------------------------------------------------------------------

/**
 * 触发一条系统对话
 *
 * @param category 系统类别（如 'signIn', 'lottery'）
 * @param trigger 触发条件（如 '每日首次签到', '抽到传说奖励'）
 * @param player 当前玩家（用于计算阶段和获取变量）
 * @param extraContext 额外的上下文变量
 * @returns 是否成功触发对话（false 表示没找到匹配的对话行）
 */
export function triggerSystemDialogue(
  category: keyof typeof CATEGORY_MAP | string,
  trigger: string,
  player: Player,
  extraContext: DialogueContext = {}
): boolean {
  const store = useNarrativeStore.getState();

  // 1. 计算当前阶段
  const worldsCompleted = getWorldsCompleted(player);
  const phase = getSystemPhase(worldsCompleted);

  // 2. 同步阶段到 store（如果变化了）
  if (store.currentPhase !== phase) {
    store.setPhase(phase);
  }

  // 3. 查找匹配的对话行
  const categoryKey = CATEGORY_MAP[category] || (category as SystemDialogueCategory);
  const dialogueLines = ALL_SYSTEM_DIALOGUE[categoryKey];
  if (!dialogueLines) {
    console.warn(`[NarrativeService] 未知的对话类别: ${category}`);
    return false;
  }

  // 4. 先检查关键剧情对话（跨阶段强制触发）
  const criticalLine = getDialogueByTrigger(STORY_CRITICAL_DIALOGUE, trigger, phase);
  const matchedLine = criticalLine || getDialogueByTrigger(dialogueLines, trigger, phase);

  if (!matchedLine) {
    // 未找到精确匹配的 trigger，尝试模糊匹配
    const fallbackLine = findFallbackDialogue(dialogueLines, trigger, phase);
    if (!fallbackLine) {
      console.warn(`[NarrativeService] 未找到对话: category=${category}, trigger=${trigger}, phase=${phase}`);
      return false;
    }
    return enqueueDialogueLine(fallbackLine, player, extraContext);
  }

  return enqueueDialogueLine(matchedLine, player, extraContext);
}

/**
 * 将对话行加入叙事队列
 */
function enqueueDialogueLine(
  line: SystemDialogueLine,
  player: Player,
  extraContext: DialogueContext
): boolean {
  const store = useNarrativeStore.getState();

  // 构建变量上下文
  const context: DialogueContext = {
    playerName: player.name,
    worldName: getWorldDisplayName(player.progress.sceneType),
    ...extraContext,
  };

  // 替换变量
  const resolvedText = resolveVariables(line.text, context);

  // 构建队列条目
  const entry: Omit<DialogueEntry, 'timestamp' | 'read'> = {
    id: `${line.id}_${Date.now()}`,
    line,
    resolvedText,
    category: line.id.split('_')[0] || 'unknown',
  };

  store.enqueueDialogue(entry);

  // 如果这是关键剧情，自动暂停其他叙事
  if (line.isStoryCritical) {
    store.setPaused(true);
  }

  return true;
}

/**
 * 模糊查找回退对话（当精确匹配失败时使用）
 */
function findFallbackDialogue(
  lines: SystemDialogueLine[],
  trigger: string,
  phase: SystemPhase
): SystemDialogueLine | undefined {
  // 策略1：同阶段内部分匹配 trigger
  const phaseLines = lines.filter(
    (l) => l.phase === phase || l.phase === 'all'
  );

  // 尝试关键词匹配
  const keywords = trigger.split(/[，。！？、\s]+/).filter((k) => k.length >= 2);
  for (const line of phaseLines) {
    for (const kw of keywords) {
      if (line.trigger.includes(kw) || kw.includes(line.trigger)) {
        return line;
      }
    }
  }

  // 策略2：返回该阶段的第一条对话（保底）
  return phaseLines[0];
}

// ------------------------------------------------------------------
// 主线剧情节点推进
// ------------------------------------------------------------------

/**
 * 检查并推进主线剧情节点
 * 应在回合推进、世界切换、等级提升等关键时机调用
 */
export function checkAndTriggerStoryNode(player: Player): StoryNode | null {
  const store = useNarrativeStore.getState();

  // 如果当前已有活跃剧情节点，不触发新的
  if (store.activeStoryNode) return null;

  const ctx: StoryProgressContext = {
    currentWorldId: player.progress.sceneType,
    sceneLevel: player.progress.sceneLevel,
    round: player.progress.round,
    essencesCollected: getWorldsCompleted(player),
    completedNodeIds: store.completedNodeIds,
    storyFlags: store.storyFlags,
  };

  // 获取当前世界的剧情弧
  const arc = getSceneArcById(ctx.currentWorldId);
  if (!arc) return null;

  // 检查四个关键节点：entryEvent → midpointTwist → essenceClimax → departure
  const nodesToCheck: { node: StoryNode; requiredLevel: number }[] = [
    { node: arc.entryEvent, requiredLevel: 1 },
    { node: arc.midpointTwist, requiredLevel: 3 },
    { node: arc.essenceClimax, requiredLevel: 5 },
    { node: arc.departure, requiredLevel: 7 },
  ];

  for (const { node, requiredLevel } of nodesToCheck) {
    // 已完成的跳过
    if (store.completedNodeIds.has(node.id)) continue;

    // 检查是否满足触发条件
    if (ctx.sceneLevel >= requiredLevel) {
      // 检查前置节点是否已完成
      const prerequisitesMet =
        !node.prerequisites ||
        node.prerequisites.every((preId) =>
          store.completedNodeIds.has(preId)
        );

      if (prerequisitesMet) {
        // 激活该节点
        store.activateStoryNode(node);
        return node;
      }
    }
  }

  return null;
}

/**
 * 处理玩家在剧情节点中的选择
 */
export function makeStoryChoice(choiceId: string): void {
  const store = useNarrativeStore.getState();
  const node = store.activeStoryNode;
  if (!node) return;

  const choice = node.node.choices?.find((c) => c.id === choiceId);
  if (choice?.longTermConsequence) {
    // 长期后果转化为 storyFlag
    const flag = `choice_${node.nodeId}_${choiceId}`;
    store.addStoryFlag(flag);
  }

  // 根据选择的价值观添加相应标记
  if (choice?.valueReflected) {
    const valueFlag = `value_${choice.valueReflected.replace(/\s+/g, '_')}`;
    store.addStoryFlag(valueFlag);
  }

  store.completeStoryNode(choiceId);
}

// ------------------------------------------------------------------
// 关键剧情事件检查
// ------------------------------------------------------------------

/**
 * 检查是否应该触发关键剧情对话
 * 在特殊时刻调用（如收集到第4个本源、第一次遭遇虚无之噬等）
 */
export function checkCriticalStoryEvent(
  eventType: string,
  player: Player,
  extraContext: DialogueContext = {}
): boolean {
  const store = useNarrativeStore.getState();

  // 防止重复触发
  const flag = `critical_${eventType}`;
  if (store.hasStoryFlag(flag)) return false;

  const worldsCompleted = getWorldsCompleted(player);
  const phase = getSystemPhase(worldsCompleted);

  // 查找关键剧情对话
  const line = getDialogueByTrigger(STORY_CRITICAL_DIALOGUE, eventType, phase);
  if (!line) return false;

  // 标记为已触发
  store.addStoryFlag(flag);

  // 加入对话队列
  return enqueueDialogueLine(line, player, extraContext);
}

// ------------------------------------------------------------------
// 辅助函数
// ------------------------------------------------------------------

/**
 * 计算玩家已完成的世界数量
 * 基于 storyFlags 中的 essence 标记
 */
function getWorldsCompleted(_player: Player): number {
  const store = useNarrativeStore.getState();
  // 从 storyFlags 中统计已收集的本源
  const essenceFlags = store.storyFlags.filter((f) =>
    f.startsWith('essence_')
  );
  return essenceFlags.length;
}

/**
 * 获取世界的显示名称
 */
function getWorldDisplayName(worldId: string): string {
  const arc = getSceneArcById(worldId);
  return arc?.worldName || worldId;
}

/**
 * 标记已收集一个世界的本源
 */
export function collectEssence(worldId: string): void {
  const store = useNarrativeStore.getState();
  store.addStoryFlag(`essence_${worldId}`);
}

/**
 * 批量同步玩家进度到叙事系统
 * 应在游戏加载、回合推进后调用
 */
export function syncNarrativeProgress(player: Player): void {
  const store = useNarrativeStore.getState();
  const worldsCompleted = getWorldsCompleted(player);
  store.syncFromPlayer(player.progress.storyFlags, worldsCompleted);
}

// ------------------------------------------------------------------
// 便捷触发函数（按系统分类）
// ------------------------------------------------------------------

/** 签到相关 */
export function triggerSignInDialogue(
  player: Player,
  trigger: '每日首次签到' | '连续签到奖励' | '周签到完成',
  context: Pick<DialogueContext, 'streak'> = {}
): boolean {
  return triggerSystemDialogue('signIn', trigger, player, context);
}

/** 升级/突破相关 */
export function triggerStatusDialogue(
  player: Player,
  trigger: '角色升级' | '大境界突破'
): boolean {
  return triggerSystemDialogue('statusPanel', trigger, player);
}

/** 任务相关 */
export function triggerTaskDialogue(
  player: Player,
  trigger: '新任务发布' | '任务完成',
  context: Pick<DialogueContext, 'taskName' | 'reward'> = {}
): boolean {
  return triggerSystemDialogue('taskSystem', trigger, player, context);
}

/** 抽奖相关 */
export function triggerLotteryDialogue(
  player: Player,
  trigger: '抽到普通奖励' | '抽到稀有奖励' | '抽到传说奖励',
  context: Pick<DialogueContext, 'itemName' | 'probability'> = {}
): boolean {
  return triggerSystemDialogue('lottery', trigger, player, context);
}

/** 副本相关 */
export function triggerCopyDialogue(
  player: Player,
  trigger: '进入副本' | '遭遇Boss' | '副本通关',
  context: Pick<DialogueContext, 'difficulty' | 'rating'> = {}
): boolean {
  return triggerSystemDialogue('copySystem', trigger, player, context);
}

/** 商店相关 */
export function triggerShopDialogue(
  player: Player,
  trigger: '打开商店' | '购买物品',
  context: Pick<DialogueContext, 'currency' | 'itemName'> = {}
): boolean {
  return triggerSystemDialogue('shop', trigger, player, context);
}

/** 炼丹相关 */
export function triggerAlchemyDialogue(
  player: Player,
  trigger: '开始炼丹' | '炼丹成功' | '炼丹失败',
  context: Pick<DialogueContext, 'recipeName' | 'successRate' | 'quality'> = {}
): boolean {
  return triggerSystemDialogue('alchemy', trigger, player, context);
}

/** 宠物相关 */
export function triggerPetDialogue(
  player: Player,
  trigger: '获得宠物' | '宠物升级',
  context: Pick<DialogueContext, 'petName' | 'potential' | 'skillName'> = {}
): boolean {
  return triggerSystemDialogue('petSystem', trigger, player, context);
}

/** 吞噬相关 */
export function triggerDevourDialogue(
  player: Player,
  trigger: '吞噬成功' | '吞噬高阶目标',
  context: Pick<DialogueContext, 'stats' | 'successRate'> = {}
): boolean {
  return triggerSystemDialogue('devourSystem', trigger, player, context);
}

/** 时间/场景切换相关 */
export function triggerTimeDialogue(
  player: Player,
  trigger: '新的一天' | '切换场景',
  context: Pick<DialogueContext, 'worldName'> = {}
): boolean {
  return triggerSystemDialogue('timeSystem', trigger, player, context);
}
