import type { Attributes, Player, SceneDefinition } from '../types';
import { SCENES } from '../data/scenes';
import { getProvider } from '../ai';
import type { WorldRecommendation, WorldShiftEvaluation } from './types';

// ============================================================
// 世界导引师 (World Guide)
// 职责：开局推荐世界 + 中期评估世界转换
// ============================================================

/** 属性到世界契合度的基线权重 */
const WORLD_FITNESS_BASE: Record<string, Record<string, number>> = {
  modern_city: { intelligence: 3, appearance: 2, family: 2, talent: 1 },
  cultivation: { talent: 3, physique: 2, intelligence: 1, luck: 1 },
  urban_fantasy: { talent: 2, intelligence: 1, luck: 2, appearance: 1 },
  apocalypse: { physique: 3, family: 1, luck: 1 },
  apoc_fantasy: { physique: 2, talent: 1, luck: 1, intelligence: 1 },
  hidden_immortal: { talent: 3, luck: 2, intelligence: 1 },
  hidden_cyber: { intelligence: 3, talent: 1, physique: 1 },
  hidden_demon: { talent: 2, physique: 2, appearance: 1 },
};

/**
 * 根据玩家属性推荐最契合的世界（本地计算 + AI 增强）
 */
export async function recommendWorld(
  attributes: Attributes,
  useAI: boolean = true
): Promise<WorldRecommendation> {
  const available = SCENES.filter(
    (s) => !s.unlockRequirement || s.unlockRequirement === ''
  );

  // 本地计算契合度
  const scores = calculateWorldFitness(attributes, available);
  const bestWorld = scores[0];
  const alternatives = scores.slice(1, 3);

  if (useAI) {
    try {
      return await aiRecommendWorld(attributes, bestWorld.scene);
    } catch {
      console.warn('AI 世界推荐失败，使用本地计算');
    }
  }

  return {
    recommendedWorld: bestWorld.scene.id,
    reason: `你的${getTopAttributeName(attributes)}最为突出，${bestWorld.scene.name}与你最为契合`,
    invitationText: `叮！位面导引系统激活！检测到宿主${getTopAttributeName(attributes)}天赋异禀，推荐穿越至「${bestWorld.scene.name}」。准备好了吗？`,
    alternativeWorlds: alternatives.map((a) => a.scene.id),
  };
}

function calculateWorldFitness(
  attributes: Attributes,
  scenes: SceneDefinition[]
): Array<{ scene: SceneDefinition; score: number }> {
  return scenes
    .map((scene) => {
      const weights = WORLD_FITNESS_BASE[scene.id] || {};
      let score = 1;
      for (const [attr, weight] of Object.entries(weights)) {
        score += (attributes as Record<string, number>)[attr] * weight;
      }
      return { scene, score };
    })
    .sort((a, b) => b.score - a.score);
}

function getTopAttributeName(attributes: Attributes): string {
  const nameMap: Record<string, string> = {
    talent: '天赋', appearance: '颜值', intelligence: '智商',
    physique: '体质', family: '家境', luck: '运气',
  };
  let maxKey = 'talent';
  let maxVal = 0;
  for (const [k, v] of Object.entries(attributes)) {
    if (v > maxVal) {
      maxVal = v;
      maxKey = k;
    }
  }
  return nameMap[maxKey] || maxKey;
}

async function aiRecommendWorld(
  attributes: Attributes,
  _topScene: SceneDefinition
): Promise<WorldRecommendation> {
  const provider = getProvider();
  const attrText = Object.entries(attributes)
    .map(([k, v]) => `${k}:${v}`)
    .join('、');

  const worldList = SCENES.filter((s) => !s.unlockRequirement)
    .map((s) => `- ${s.name}（${s.id}）：${s.description}`)
    .join('\n');

  const prompt = `你是一位位面导引者。玩家刚刚分配完自身天赋，属性如下：
${attrText}

可用世界列表：
${worldList}

请根据玩家属性，从上述世界中推荐一个最适合的世界，并提供一个无法拒绝的穿越邀请语（系统口吻）。输出JSON：
{
  "recommended_world": "世界名（必须与列表中的名称一致）",
  "reason": "简短理由（基于属性，20字内）",
  "invitation_text": "一段充满诱惑力的系统邀请语，融入玩家属性优势",
  "alternative_worlds": ["备选世界1", "备选世界2"]
}
只输出JSON，不要其他内容。`;

  const raw = await provider.generateScene({
    player: {
      name: '', attributes,
      stats: { level: 1, exp: 0, hp: 100, maxHp: 100, mp: 50, maxMp: 50, combatPower: 0, wealth: 0, fame: 0 },
      system: { id: '', name: '', level: 1, exp: 0, features: [] },
      progress: { sceneType: 'modern_city', sceneLevel: 1, round: 1, age: 16, storyFlags: [] },
      inventory: [], equipment: {}, skills: [], activeTasks: [], completedTasks: [],
      achievements: [], history: [], talents: [],
      npcs: [], relationships: {},
      storyMemory: { longTermSummary: '', recentEvents: [], decisionLog: [] },
      worldState: { currentLocation: '', timeline: '', globalFlags: {} },
      extendedSystem: { dialogueStyle: '' },
      endingProgress: { targetEndingId: '', conditionStatus: {}, isFailed: false },
    },
    sceneType: 'modern_city', sceneName: '位面导引', round: 0, age: 0, history: [],
  });

  try {
    const cleaned = raw.text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleaned);
    return {
      recommendedWorld: data.recommended_world || '',
      reason: data.reason || '',
      invitationText: data.invitation_text || '',
      alternativeWorlds: data.alternative_worlds || [],
    };
  } catch {
    throw new Error('AI 世界推荐解析失败');
  }
}

// ============================================================
// 世界转换评估 (§4)
// ============================================================

const WORLD_SHIFT_CHECK_INTERVAL = 10; // 每10回合检查一次

/**
 * 评估是否应该触发世界转换
 */
export function shouldCheckWorldShift(round: number): boolean {
  return round > 0 && round % WORLD_SHIFT_CHECK_INTERVAL === 0;
}

/**
 * 评估世界转换（本地计算）
 */
export function evaluateWorldShiftLocal(player: Player): WorldShiftEvaluation {
  const scores = calculateWorldFitness(player.attributes, SCENES);

  const currentSceneId = player.progress.sceneType;
  const currentScore = scores.find((s) => s.scene.id === currentSceneId);
  const bestScore = scores[0];

  const currentFit = currentScore?.score || 0;
  const bestFit = bestScore.score;

  const fitnessScores: Record<string, number> = {};
  for (const { scene, score } of scores) {
    fitnessScores[scene.id] = score;
  }

  // 如果某个非当前世界的契合度远高于当前世界（>20%差距）
  const gap = (bestFit - currentFit) / Math.max(1, currentFit);

  if (gap > 0.2 && bestScore.scene.id !== currentSceneId) {
    return {
      shouldShift: true,
      targetWorld: bestScore.scene.id,
      shiftEventIdea: `在一次意外中，主角被卷入时空裂隙，醒来时发现自己身处${bestScore.scene.name}。`,
      fitnessScores,
    };
  }

  return {
    shouldShift: false,
    fitnessScores,
  };
}

/**
 * AI 评估世界转换
 */
export async function evaluateWorldShiftAI(player: Player): Promise<WorldShiftEvaluation> {
  const localResult = evaluateWorldShiftLocal(player);
  if (!localResult.shouldShift) return localResult;

  const provider = getProvider();
  const attrText = Object.entries(player.attributes)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  const worldsWithScores = Object.entries(localResult.fitnessScores)
    .map(([id, score]) => {
      const scene = SCENES.find((s) => s.id === id);
      return `${scene?.name || id}: ${score.toFixed(1)}`;
    })
    .join('，');

  const prompt = `玩家当前属性：{${attrText}}，当前世界：${player.progress.sceneType}。
各世界与玩家属性的契合度：${worldsWithScores}

如果某个非当前世界的契合度远高于当前世界（>20%差距），你可以建议生成一个"世界裂缝"事件，让剧情自然过渡到新世界。输出JSON：
{
  "should_shift": true/false,
  "target_world": "推荐世界ID",
  "shift_event_idea": "一个模糊的剧情点子，如：在一次爆炸中，主角被卷入时空裂隙，醒来时发现身处末世废墟。"
}
只输出JSON。`;

  try {
    const raw = await provider.generateScene({
      player,
      sceneType: player.progress.sceneType,
      sceneName: SCENES.find((s) => s.id === player.progress.sceneType)?.name || '',
      round: player.progress.round,
      age: player.progress.age,
      history: [],
    });

    const cleaned = raw.text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleaned);
    return {
      shouldShift: data.should_shift ?? localResult.shouldShift,
      targetWorld: data.target_world || localResult.targetWorld,
      shiftEventIdea: data.shift_event_idea || localResult.shiftEventIdea,
      fitnessScores: localResult.fitnessScores,
    };
  } catch {
    return localResult;
  }
}
