import type { Player, EndingDefinition } from '../types';
import { getEndingById, ENDINGS } from '../data/endings';
import { calculateEndingProgress, evaluateCondition } from '../engine/endingTracker';
import type { EndingEvaluation, ConditionMutation, DynamicEndingPrototype } from './types';
import { DEEPSEEK_API_KEY } from '../ai';

/**
 * 结局守望者 (Ending Watcher) §3.2, §5
 * 包装 endingTracker，添加 AI 评估 + 条件变形
 */

/**
 * 评估结局进度（本地计算）
 */
export function evaluateEndingLocal(player: Player): EndingEvaluation {
  const ending = getEndingById(player.endingProgress.targetEndingId);
  if (!ending) {
    return {
      conditionProgress: {},
      overallFeasibility: 0,
      isStillPossible: true,
      narrativeHint: '命运的方向尚未明确...',
    };
  }

  const progress = calculateEndingProgress(player, ending);
  const completedCount = ending.victoryConditions.filter((c) => progress[c] === true).length;
  const totalCount = ending.victoryConditions.length;
  const feasibility = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 50;

  // 检查失败条件
  const anyFail = ending.failConditions.some((c) => progress[`fail_${c}`] === true);

  // 生成隐式引导
  const hint = generateLocalHint(ending, progress, player);

  return {
    conditionProgress: ending.victoryConditions.reduce(
      (acc, c) => ({ ...acc, [c]: progress[c] ? 100 : 0 }),
      {} as Record<string, number>
    ),
    overallFeasibility: anyFail ? 10 : feasibility,
    isStillPossible: !anyFail,
    narrativeHint: hint,
  };
}

/**
 * 生成本地结局引导提示
 */
function generateLocalHint(
  ending: EndingDefinition,
  progress: Record<string, boolean | number>,
  _player: Player
): string {
  const uncompleted = ending.victoryConditions.filter((c) => progress[c] !== true);
  if (uncompleted.length === 0) {
    return '你感觉到命运之线正在收束，终点近在眼前...';
  }

  const first = uncompleted[0];
  if (first.includes('wealth')) return '主角可能需要积累更多财富...';
  if (first.includes('fame')) return '声望似乎还不够，需要在世间留下更多的传说...';
  if (first.includes('combatPower')) return '力量还不足以撼动命运，需要继续修炼...';
  if (first.includes('level')) return '前路漫漫，等级还远远不够...';
  if (first.includes('npc:')) {
    const npcName = first.replace('npc:', '').split(' ')[0].split('>=')[0].trim();
    return `${npcName}与你命运相连，维系这段关系至关重要...`;
  }
  if (first.includes('has_item:')) {
    const itemName = first.replace('has_item:', '');
    return `你隐约感到，获得${itemName}可能是关键...`;
  }
  if (first.includes('talent')) return '天赋还需要进一步觉醒...';
  if (first.includes('intelligence')) return '智慧的火花还不够明亮...';

  return `继续前行，命运会指引方向...`;
}

// ============================================================
// 动态条件变形 (§5)
// ============================================================

/** 备选条件池 */
const FALLBACK_CONDITION_POOL: Record<string, string[]> = {
  wealth: ['wealth >= 150000', 'fame >= 2000', 'has_item:财富之书'],
  combat: ['combatPower >= 15000', 'level >= 80', 'has_item:上古神器'],
  social: ['npc:任意 >= 80', 'fame >= 2500', 'wealth >= 120000'],
  talent: ['talent >= 10', 'intelligence >= 10', 'has_item:天赋觉醒书'],
  item: ['has_item:传说之剑', 'has_item:神级丹药', 'combatPower >= 20000'],
};

/**
 * 尝试条件变形（本地降级：从备选池抽取）
 */
export function attemptConditionMutation(
  condition: string,
  _player: Player
): ConditionMutation {
  // 根据条件类型选择备选池
  let poolKey = 'combat';
  if (condition.includes('wealth') || condition.includes('fame')) poolKey = 'wealth';
  else if (condition.includes('npc')) poolKey = 'social';
  else if (condition.includes('talent') || condition.includes('intelligence')) poolKey = 'talent';
  else if (condition.includes('has_item')) poolKey = 'item';

  const pool = FALLBACK_CONDITION_POOL[poolKey] || FALLBACK_CONDITION_POOL.combat;
  const available = pool.filter((c) => c !== condition);

  if (available.length === 0) {
    return { canMutate: false };
  }

  const newCondition = available[Math.floor(Math.random() * available.length)];

  return {
    canMutate: true,
    newCondition,
    newHint: `命运发生了微妙的变化，一个新的目标浮现...`,
  };
}

/**
 * 检查并尝试对所有不可满足的条件进行变形
 */
export function mutateEndingConditions(
  player: Player,
  ending: EndingDefinition
): { mutated: boolean; newConditions: string[] } {
  let mutated = false;
  const newConditions = [...ending.victoryConditions];

  for (let i = 0; i < newConditions.length; i++) {
    const cond = newConditions[i];
    const value = evaluateCondition(cond, player);

    // 如果条件为 false 且需要特定 NPC（npc 已死亡），尝试变形
    if (value === false && cond.startsWith('npc:')) {
      const npcName = cond.replace('npc:', '').split(' ')[0].split('>=')[0].trim();
      const npc = player.npcs.find((n) => n.name === npcName);
      if (npc && !npc.isAlive) {
        // NPC 已死亡，条件永远无法满足
        const mutation = attemptConditionMutation(cond, player);
        if (mutation.canMutate && mutation.newCondition) {
          newConditions[i] = mutation.newCondition;
          mutated = true;
        }
      }
    }
  }

  return { mutated, newConditions };
}

// ============================================================
// AI 增强评估（可选）
// ============================================================

/**
 * AI 评估结局可行性
 */
export async function evaluateEndingAI(player: Player): Promise<EndingEvaluation> {
  const localResult = evaluateEndingLocal(player);
  const ending = getEndingById(player.endingProgress.targetEndingId);
  if (!ending) return localResult;

  if (!DEEPSEEK_API_KEY) return localResult;

  const attrText = Object.entries(player.attributes)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  const npcText = player.npcs
    .filter((n) => n.isAlive)
    .map((n) => `${n.name}（关系${n.relationship}，${n.currentStatus}）`)
    .join('；');

  const prompt = `你监控隐藏结局的达成情况。结局条件：${ending.victoryConditions.join('，')}。
玩家属性：${attrText}
关键NPC状态：${npcText || '无'}
长期剧情摘要：${player.storyMemory.longTermSummary || '无'}

请评估每项条件的完成度（0-100%），判断结局是否仍可能。输出JSON：
{
  "condition_progress": {${ending.victoryConditions.map((c) => `"${c}": 0`).join(', ')}},
  "overall_feasibility": 50,
  "is_still_possible": true,
  "narrative_hint": "一条隐式引导建议。此提示将传递给剧情生成器，但绝不可包含结局名称。"
}
只输出JSON`;

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
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return localResult;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      conditionProgress: parsed.condition_progress || localResult.conditionProgress,
      overallFeasibility: parsed.overall_feasibility || localResult.overallFeasibility,
      isStillPossible: parsed.is_still_possible ?? localResult.isStillPossible,
      narrativeHint: parsed.narrative_hint || localResult.narrativeHint,
    };
  } catch {
    return localResult;
  }
}
