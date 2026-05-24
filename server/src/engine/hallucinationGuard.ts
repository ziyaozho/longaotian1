import type { Player, Choice } from '../types';

// ============================================================
// AI 生成内容校验框架
// ============================================================

/** AI 生成的单回合内容结构 */
export interface GeneratedTurnPayload {
  narrative: string;
  systemDialogue: string;
  choices: Choice[];
  attributeChanges: Record<string, number>;
  newEvents: string[];
  npcMentions?: string[];
  locationChange?: string;
  flagChanges?: Record<string, boolean>;
}

export interface ValidationIssue {
  type: 'npc_hallucination' | 'item_hallucination' | 'event_repeat' | 'ending_deviation' | 'location_inconsistency';
  message: string;
  severity: 'minor' | 'major' | 'critical';
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  severity: 'none' | 'minor' | 'major' | 'critical';
}

// ============================================================
// 校验规则
// ============================================================

/** 规则1: NPC 复活检测（critical） */
function checkNPCRevival(payload: GeneratedTurnPayload, player: Player): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const npcName of payload.npcMentions || []) {
    const npc = player.npcs.find((n) => n.name === npcName);
    if (npc && !npc.isAlive) {
      issues.push({
        type: 'npc_hallucination',
        message: `NPC "${npcName}" 已在第${npc.firstMetRound}回合后标记为死亡，不应再次出现`,
        severity: 'critical',
        suggestion: `移除${npcName}的出现，或用其他NPC替代`,
      });
    }
  }

  return issues;
}

/** 规则2: 道具/属性变化异常检测（major） */
function checkItemHallucination(payload: GeneratedTurnPayload, player: Player): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [key, delta] of Object.entries(payload.attributeChanges)) {
    const current =
      (player.stats as Record<string, number>)[key] ??
      (player.attributes as Record<string, number>)[key] ??
      0;

    // 单次变化超过当前值的50%视为可疑
    if (Math.abs(delta) > current * 0.5 && current > 0) {
      issues.push({
        type: 'item_hallucination',
        message: `${key} 单次变化 ${delta > 0 ? '+' : ''}${delta}，超过当前值 ${current} 的50%，可能不合理`,
        severity: 'major',
        suggestion: '将变化幅度限制在合理范围内',
      });
    }
  }

  return issues;
}

/** 规则3: 重复事件检测（minor） */
function checkEventRepetition(payload: GeneratedTurnPayload, player: Player): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const recentSet = new Set(player.storyMemory.recentEvents.map((e) => e.event));

  for (const event of payload.newEvents) {
    if (recentSet.has(event)) {
      issues.push({
        type: 'event_repeat',
        message: `事件 "${event}" 与近期事件重复`,
        severity: 'minor',
        suggestion: '换一个不同的事件',
      });
    }
  }

  return issues;
}

/** 规则4: 结局偏离检测（major） */
function checkEndingDeviation(payload: GeneratedTurnPayload, player: Player): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!player.endingProgress.targetEndingId) return issues;

  // 检查 choices 是否永久封闭了结局可能性
  for (const choice of payload.choices) {
    const text = choice.text.toLowerCase();

    // 简单启发式：如果选项包含极端负面词汇
    const extremeNegative = ['杀', '背叛', '毁灭', '同归于尽', '放弃一切'];
    const hasExtreme = extremeNegative.some((w) => text.includes(w));

    if (hasExtreme) {
      issues.push({
        type: 'ending_deviation',
        message: `选项 "${choice.text}" 包含极端行为，可能永久破坏结局走向`,
        severity: 'major',
        suggestion: '确保此选择不会永久封闭所有结局可能性',
      });
    }
  }

  return issues;
}

/** 规则5: 地点不一致检测（minor） */
function checkLocationConsistency(payload: GeneratedTurnPayload, player: Player): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!payload.locationChange) return issues;

  // 简单的场景-地点风格映射
  const sceneStyleKeywords: Record<string, string[]> = {
    modern_city: ['地铁', '公司', '街头', '酒吧', '停车场', '写字楼', '公寓'],
    cultivation: ['宗门', '洞府', '灵脉', '仙山', '秘境', '擂台', '丹房'],
    urban_fantasy: ['古街', '灵界', '巷弄', '茶馆', '武馆'],
    apocalypse: ['废墟', '避难所', '荒野', '营地', '辐射区'],
    apoc_fantasy: ['深渊', '遗迹', '战场', '祭坛', '魔窟'],
    hidden_immortal: ['仙岛', '洞天', '福地', '天梯', '星河'],
    hidden_cyber: ['数据空间', '虚拟世界', '神经网络', '云端'],
    hidden_demon: ['魔域', '血池', '深渊', '炼狱', '魔宫'],
  };

  const keywords = sceneStyleKeywords[player.progress.sceneType] || [];
  const location = payload.locationChange;

  // 如果地点完全不属于当前场景风格，发出警告
  const hasMatch = keywords.some((k) => location.includes(k));
  if (!hasMatch && keywords.length > 0) {
    // 只是警告，不强制阻止（可能有跨界场景）
    issues.push({
      type: 'location_inconsistency',
      message: `地点 "${location}" 与当前场景风格不一致`,
      severity: 'minor',
      suggestion: `考虑使用更符合${player.progress.sceneType}风格的地点名称`,
    });
  }

  return issues;
}

// ============================================================
// 主校验入口
// ============================================================

/**
 * 校验 AI 生成的内容
 */
export function validateGeneratedContent(
  payload: GeneratedTurnPayload,
  player: Player
): ValidationResult {
  const allIssues: ValidationIssue[] = [];

  allIssues.push(...checkNPCRevival(payload, player));
  allIssues.push(...checkItemHallucination(payload, player));
  allIssues.push(...checkEventRepetition(payload, player));
  allIssues.push(...checkEndingDeviation(payload, player));
  allIssues.push(...checkLocationConsistency(payload, player));

  const hasCritical = allIssues.some((i) => i.severity === 'critical');
  const hasMajor = allIssues.some((i) => i.severity === 'major');

  const severity: ValidationResult['severity'] = hasCritical
    ? 'critical'
    : hasMajor
    ? 'major'
    : allIssues.length > 0
    ? 'minor'
    : 'none';

  return {
    valid: allIssues.length === 0,
    issues: allIssues,
    severity,
  };
}

// ============================================================
// 统计
// ============================================================

export const hallucinationStats = {
  totalTurns: 0,
  totalIssues: 0,
  issueByType: {} as Record<string, number>,
  retryCount: 0,
  fallbackCount: 0,
};

export function recordValidation(result: ValidationResult) {
  hallucinationStats.totalTurns++;
  hallucinationStats.totalIssues += result.issues.length;
  for (const issue of result.issues) {
    hallucinationStats.issueByType[issue.type] = (hallucinationStats.issueByType[issue.type] || 0) + 1;
  }
}
