import type { Player, NPCState } from '../types';
import { checkProbability, randomChoice } from '../utils/random';

// ============================================================
// NPC 自主行动引擎
// ============================================================

const AUTONOMY_CHANCE = 0.2; // 每个存活NPC每回合20%概率自主行动

export interface NPCAutonomyAction {
  npcId: string;
  name: string;
  action: string;
  newStatus: string;
  newGoal?: string;
  newMemory?: string;
  worldHint: string; // 展示给玩家的世界传闻
}

/** 通用自主行动模板 */
const GENERIC_AUTONOMY_TEMPLATES: Array<{
  description: string;
  newStatus: string;
  worldHint: string;
}> = [
  { description: '在城中打探消息', newStatus: '在城中活动', worldHint: '你听说{name}最近在四处打探消息...' },
  { description: '独自修炼提升实力', newStatus: '闭关修炼中', worldHint: '有传闻说{name}的实力又有了突破...' },
  { description: '遭遇了小麻烦', newStatus: '处境有些困难', worldHint: '你隐约听说{name}最近遇到了一些麻烦...' },
  { description: '结识了新朋友', newStatus: '在社交中', worldHint: '有人看到{name}和一个陌生人走得很近...' },
  { description: '发现了某处秘境', newStatus: '探索秘境', worldHint: '有消息称{name}发现了一处未知的秘境...' },
];

/** NPC 特定行动模板 */
const NPC_SPECIFIC_TEMPLATES: Record<string, Array<{
  description: string;
  newStatus: string;
  worldHint: string;
}>> = {
  su_qing: [
    { description: '在图书馆查阅关于系统的古籍', newStatus: '在图书馆查阅资料', worldHint: '你注意到苏晴最近总泡在图书馆的古籍区...' },
    { description: '向其他学生打听你的消息', newStatus: '暗中调查你', worldHint: '有同学说苏晴最近一直在打听你的事情...' },
    { description: '在实验室做灵力波动分析', newStatus: '分析灵力数据', worldHint: '你听说苏晴在实验室待到很晚，似乎在研究什么...' },
  ],
  lao_gui: [
    { description: '在黑市收购稀有材料', newStatus: '在黑市活动', worldHint: '黑市传来消息，老鬼最近在高价收购某种稀有材料...' },
    { description: '躲避执法队的追踪', newStatus: '隐藏行踪', worldHint: '你听说老鬼最近惹上了麻烦，正在被追查...' },
  ],
};

/**
 * 触发 NPC 自主行动
 * @returns 行动列表，每个行动包含世界传闻
 */
export function triggerNPCAutonomy(player: Player): NPCAutonomyAction[] {
  const actions: NPCAutonomyAction[] = [];

  for (const npc of player.npcs) {
    if (!npc.isAlive) continue;
    if (!checkProbability(AUTONOMY_CHANCE)) continue;

    const action = generateNPCAction(npc);

    actions.push({
      npcId: npc.npcId,
      name: npc.name,
      action: action.description,
      newStatus: action.newStatus,
      newGoal: action.newGoal,
      newMemory: action.newMemory,
      worldHint: action.worldHint.replaceAll('{name}', npc.name),
    });
  }

  return actions;
}

function generateNPCAction(npc: NPCState): {
  description: string;
  newStatus: string;
  newGoal?: string;
  newMemory?: string;
  worldHint: string;
} {
  const templates = NPC_SPECIFIC_TEMPLATES[npc.npcId] || GENERIC_AUTONOMY_TEMPLATES;
  const template = randomChoice(templates);

  return {
    description: template.description,
    newStatus: template.newStatus,
    worldHint: template.worldHint,
  };
}

/**
 * 根据关系值获取关系标签
 */
export function getRelationshipLabel(value: number): string {
  if (value >= 80) return '羁绊';
  if (value >= 50) return '亲近';
  if (value >= 10) return '友善';
  if (value >= -10) return '中立';
  if (value >= -50) return '冷淡';
  return '敌对';
}

/**
 * 根据关系值获取关系颜色
 */
export function getRelationshipColor(value: number): string {
  if (value >= 80) return '#e74c3c'; // 红色（羁绊）
  if (value >= 50) return '#f39c12'; // 橙色（亲近）
  if (value >= 10) return '#27ae60'; // 绿色（友善）
  if (value >= -10) return '#7f8c8d'; // 灰色（中立）
  if (value >= -50) return '#2980b9'; // 蓝色（冷淡）
  return '#8e44ad'; // 紫色（敌对）
}
