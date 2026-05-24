import type { Player, Attributes, EndingDefinition, EndingProgress } from '../types';
import { ENDINGS, getEndingById } from '../data/endings';

// ============================================================
// 开局结局选定
// ============================================================

/** 各结局的属性倾向权重 */
const ENDING_ATTR_WEIGHTS: Record<string, Record<string, number>> = {
  ending_modern_king: { family: 2, intelligence: 1, appearance: 1 },
  ending_immortal_hermit: { talent: 3, intelligence: 1, luck: 1 },
  ending_urban_legend: { talent: 2, luck: 2, appearance: 1 },
  ending_apocalypse_savior: { physique: 2, family: 1, luck: 1 },
  ending_apoc_fantasy_rider: { physique: 2, talent: 1, appearance: 1 },
  ending_hidden_immortal: { talent: 2, intelligence: 1, luck: 1 },
  ending_cyber_god: { intelligence: 3, talent: 1 },
  ending_demon_overlord: { talent: 2, physique: 1 },
};

/**
 * 根据玩家属性加权随机选择隐藏结局
 * 属性倾向影响概率但不决定结果，制造"反差感"也是一种乐趣
 */
export function selectEndingByAttributes(
  attributes: Attributes,
  endings: EndingDefinition[] = ENDINGS
): EndingDefinition {
  const weights = endings.map((ending) => {
    const weightMap = ENDING_ATTR_WEIGHTS[ending.endingId] ?? {};
    let score = 1; // 基础分，确保每个结局都有概率被选中
    for (const [attr, multiplier] of Object.entries(weightMap)) {
      const val = (attributes as Record<string, number>)[attr] ?? 0;
      score += val * multiplier;
    }
    return { ending, score };
  });

  const total = weights.reduce((sum, w) => sum + w.score, 0);
  let rand = Math.random() * total;

  for (const { ending, score } of weights) {
    rand -= score;
    if (rand <= 0) return ending;
  }

  // 兜底返回最后一个
  return endings[endings.length - 1];
}

// ============================================================
// 结局进度追踪
// ============================================================

/**
 * 解析并评估单个条件表达式
 */
export function evaluateCondition(
  condition: string,
  player: Player
): boolean | number {
  // "wealth >= 100000"
  const statMatch = condition.match(/^(\w+)\s*([>=<]+)\s*(\d+)$/);
  if (statMatch) {
    const [, key, op, val] = statMatch;
    const actual =
      (player.stats as Record<string, number>)[key] ??
      (player.attributes as Record<string, number>)[key] ??
      0;
    const target = parseInt(val, 10);
    switch (op) {
      case '>=': return actual >= target;
      case '<=': return actual <= target;
      case '>': return actual > target;
      case '<': return actual < target;
      case '==': return actual === target;
      default: return false;
    }
  }

  // "npc:苏晴 >= 80"
  const npcMatch = condition.match(/^npc:(.+)\s*([>=<]+)\s*(-?\d+)$/);
  if (npcMatch) {
    const [, name, op, val] = npcMatch;
    const actual = player.relationships[name] ?? 0;
    const target = parseInt(val, 10);
    switch (op) {
      case '>=': return actual >= target;
      case '<=': return actual <= target;
      case '>': return actual > target;
      case '<': return actual < target;
      case '==': return actual === target;
      default: return false;
    }
  }

  // "has_item:九转金丹"
  const itemMatch = condition.match(/^has_item:(.+)$/);
  if (itemMatch) {
    const itemName = itemMatch[1];
    return player.inventory.some((i) => i.name === itemName);
  }

  // "dead"
  if (condition === 'dead') return player.stats.hp <= 0;

  // "global:xxx == true"
  const globalMatch = condition.match(/^global:(\w+)\s*==\s*(true|false)$/);
  if (globalMatch) {
    const [, flag, val] = globalMatch;
    return player.worldState.globalFlags[flag] === (val === 'true');
  }

  return false;
}

/**
 * 计算当前玩家对指定结局的条件完成度
 */
export function calculateEndingProgress(
  player: Player,
  ending: EndingDefinition
): Record<string, boolean | number> {
  const status: Record<string, boolean | number> = {};

  for (const cond of ending.victoryConditions) {
    status[cond] = evaluateCondition(cond, player);
  }
  for (const cond of ending.failConditions) {
    status[`fail_${cond}`] = evaluateCondition(cond, player);
  }

  return status;
}

/**
 * 检查是否触发结局（胜利或失败）
 */
export function checkEndingTrigger(
  player: Player,
  ending?: EndingDefinition
): { triggered: boolean; isVictory: boolean } {
  const targetEnding = ending ?? getEndingById(player.endingProgress.targetEndingId);
  if (!targetEnding) return { triggered: false, isVictory: false };

  const progress = calculateEndingProgress(player, targetEnding);

  // 检查失败条件
  const anyFail = targetEnding.failConditions.some(
    (c) => progress[`fail_${c}`] === true
  );
  if (anyFail) return { triggered: true, isVictory: false };

  // 检查胜利条件（全部满足）
  const allVictory = targetEnding.victoryConditions.every(
    (c) => progress[c] === true
  );
  if (allVictory) return { triggered: true, isVictory: true };

  return { triggered: false, isVictory: false };
}

// ============================================================
// AI Prompt 结局约束注入
// ============================================================

/**
 * 构建隐藏结局约束文本，注入 AI prompt
 */
export function buildEndingConstraint(
  player: Player,
  ending?: EndingDefinition
): string {
  const targetEnding = ending ?? getEndingById(player.endingProgress.targetEndingId);
  if (!targetEnding) return '';

  const progress = calculateEndingProgress(player, targetEnding);

  let progressText = '';
  for (const cond of targetEnding.victoryConditions) {
    const val = progress[cond];
    const display =
      typeof val === 'boolean'
        ? val
          ? '已完成'
          : '未完成'
        : `${val}`;
    progressText += `- ${cond}（${display}）\n`;
  }

  return (
    `[隐藏结局指引 - 仅限系统内部参考，不可直接向玩家透露结局名称]\n` +
    `结局代号：${targetEnding.endingId}\n` +
    `达成条件：${targetEnding.victoryConditions.join('，')}\n` +
    `当前进度：\n${progressText}` +
    `基调要求：${targetEnding.tone}\n` +
    `请生成符合此方向的剧情。可以设置障碍、诱惑、意外，但总体不得永久封闭达成结局的可能性。`
  );
}

// ============================================================
// 结局回顾生成
// ============================================================

/**
 * 构建结局回顾的 AI prompt
 * 基于结构化的 decisionLog，不会捏造事实
 */
export function buildEndingReviewPrompt(
  player: Player,
  ending: EndingDefinition
): string {
  const decisions = player.storyMemory.decisionLog;
  const summary = player.storyMemory.longTermSummary;

  const decisionText =
    decisions.length > 0
      ? decisions
          .map((d) => `- 第${d.round}回合：选择"${d.choice}"，结果：${d.result}`)
          .join('\n')
      : '无决策记录';

  return (
    `请根据以下玩家真实历程，写一段 300 字以内的结局回顾文。\n\n` +
    `结局名称：${ending.name}\n` +
    `结局基调：${ending.tone}\n` +
    `长期剧情摘要：${summary || '无'}\n\n` +
    `关键决策记录（必须提及至少 3 个）：\n${decisionText}\n\n` +
    `要求：\n` +
    `1. 语气需符合结局的"${ending.tone}"基调\n` +
    `2. 必须提及至少 3 个具体的选择及后果\n` +
    `3. 可以适当抒情，但所有事件必须真实对应上述记录\n` +
    `4. 不要编造记录中没有的事件或 NPC\n` +
    `5. 以第二人称"你"叙述`
  );
}

// ============================================================
// 评分算法（确定算法，不用 AI）
// ============================================================

/**
 * 根据最终状态计算结局评分
 */
export function calculateEndingGrade(
  player: Player
): 'S' | 'A' | 'B' | 'C' | 'D' {
  const { stats, storyMemory, endingProgress } = player;

  let score = 0;

  // 基础属性分（0-30）
  score += Math.min(30, (stats.combatPower / 5000) * 30);

  // 财富声望分（0-20）
  score += Math.min(20, ((stats.wealth + stats.fame * 100) / 100000) * 20);

  // 决策丰富度分（0-20）
  score += Math.min(20, storyMemory.decisionLog.length * 2);

  // 结局完成度分（0-30）
  const conditions = Object.values(endingProgress.conditionStatus);
  const completed = conditions.filter((c) => c === true).length;
  score += conditions.length > 0 ? (completed / conditions.length) * 30 : 0;

  // 评级
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 30) return 'C';
  return 'D';
}
