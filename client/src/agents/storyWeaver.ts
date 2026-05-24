import type { Player, Choice, Attributes } from '../types';
import type { NarrativeContext, StoryWeaverOutput, EconomicState, ArtifactUsageHint } from './types';
import { getSceneById } from '../data/scenes';
import { summarizeHistory } from '../ai/contextManager';
import { buildPersonaPrompt, getSystemPersona } from './personaActor';

export function buildNarrativeContext(
  player: Player,
  longTermSummary: string,
  recentEvents: { round: number; event: string }[],
  endingHint: string,
  worldShiftSignal: import('./types').WorldShiftSignal | null,
  playerChoice?: string,
  economicState?: EconomicState,
  artifactHints?: ArtifactUsageHint[],
): NarrativeContext {
  const scene = getSceneById(player.progress.sceneType);
  const persona = getSystemPersona(player);

  return {
    worldSetting: scene?.stylePrompt || '通用世界设定',
    systemPersonality: buildPersonaPrompt(persona),
    longTermSummary,
    recentEvents,
    player,
    npcStatuses: player.npcStatuses,
    endingHint,
    worldShiftSignal,
    playerChoice,
    economicState: economicState || { gold: player.stats.gold, tradableItems: [] },
    artifactHints: artifactHints || [],
  };
}

export function buildEconomicState(player: Player): EconomicState {
  const tradableItems = player.inventory
    .filter((i) => i.rarity !== 'common' || i.type === 'material')
    .map((i) => ({
      name: i.name,
      type: i.type,
      estimatedValue: i.rarity === 'legendary' ? 500 : i.rarity === 'epic' ? 200 : i.rarity === 'rare' ? 80 : 30,
    }));
  return { gold: player.stats.gold, tradableItems };
}

export function buildArtifactHints(player: Player): ArtifactUsageHint[] {
  return player.artifacts.map((a) => {
    const unusedRounds = a.cooldown > 0 ? a.cooldown : 0;
    return {
      artifactId: a.id,
      artifactName: a.name,
      ability: a.abilities[a.upgradeLevel] || a.abilities[0],
      unusedRounds,
      suggestedScene: getArtifactSceneSuggestion(a.id),
    };
  });
}

function getArtifactSceneSuggestion(artifactId: string): string {
  const suggestions: Record<string, string> = {
    small_green_bottle: '遭遇急需灵药的任务，或发现稀有灵植时',
    realm_breaker: '被围困或需要快速穿越险境时',
    fate_wheel: '面临重大抉择或绝境需要逆转时',
    memory_book: '需要回顾线索、识破幻觉或预判敌人动向时',
  };
  return suggestions[artifactId] || '关键时刻';
}

export function buildStoryWeaverPrompt(context: NarrativeContext): string {
  const { player, worldSetting, systemPersonality, longTermSummary, recentEvents, endingHint, worldShiftSignal, economicState, artifactHints } = context;

  const scene = getSceneById(player.progress.sceneType);
  const attrText = Object.entries(player.attributes)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  const recentText = recentEvents.length > 0
    ? recentEvents.map((e) => `[回合${e.round}] ${e.event}`).join('\n')
    : '（游戏刚刚开始）';

  const worldShiftText = worldShiftSignal?.shouldShift
    ? `世界转换预兆：${worldShiftSignal.shiftEventIdea} 目标世界：${worldShiftSignal.targetWorld}`
    : '（无）';

  const merchantChance = player.progress.round % 5 === 0 ? 40 : 10;
  const merchantSection = buildMerchantSection(economicState, merchantChance);
  const artifactSection = buildArtifactSection(artifactHints, player.artifacts);

  return `你是《万界行者》的剧情编织者，负责为玩家生成沉浸式的叙事内容。

【世界观设定】
${worldSetting}
场景名称：${scene?.name || '未知世界'}
当前境界：${scene?.realmNames?.[Math.min(player.progress.sceneLevel - 1, (scene?.realmNames.length || 1) - 1)] || '凡人'}

【系统精灵设定】
${systemPersonality}

【长期剧情摘要】
${longTermSummary || '（故事刚刚开始...）'}

【最近发生的事】
${recentText}

【玩家当前状态】
- 姓名：${player.name}
- 年龄：${player.progress.age}岁
- 回合：${player.progress.round}
- 属性：${attrText}
- 等级：${player.stats.level} | 生命：${player.stats.hp}/${player.stats.maxHp} | 灵力：${player.stats.mp}/${player.stats.maxMp}
- 战斗力：${player.stats.combatPower} | 财富：${player.stats.wealth} | 声望：${player.stats.fame} | 金币：${player.stats.gold}
- 天赋：${player.talents.map((t) => t.name).join('、') || '无'}
- 持有奇物：${player.artifacts.map((a) => `${a.name}(Lv.${a.upgradeLevel}/${a.maxUpgradeLevel})`).join('、') || '无'}
- 历史摘要：${summarizeHistory(player.history.slice(-10).map((h) => h.description), 1500)}

【结局隐性指引】
${endingHint || '（无特定指引，顺其自然发展）'}

【世界转换预兆】
${worldShiftText}

${merchantSection}

${artifactSection}

【创作铁律】
1. 场景描述80-150字，精炼有画面感
2. 系统发言10-25字，简洁有个性
3. 生成4个玩家选项，要有策略性差异（谨慎/冒险/社交/特殊）
4. 属性变化要温和（单项不超过±3）
5. 新事件要与近期事件有明显差异，避免重复
6. 所有输出必须是中文
7. 如果玩家HP低于30%，可以加入恢复相关选项
8. 不要写死关键角色，除非剧情逻辑明确需要
9. 若触发商人事件，商人性格可设定为古怪、狡黠或幽默，出售物品需与玩家当前境况相关
10. 若玩家持有逆天道具，需在道具高光时刻明确描写其效果
11. 压缩废话，每句话都推动剧情，拒绝水字数

【输出格式】
严格返回以下JSON格式：
{
  "sceneDescription": "场景描述(80-150字)",
  "systemDialogue": "系统精灵的发言(10-25字)",
  "npcInteractions": [
    {"npcId": "npc_1", "npcName": "NPC名称", "dialogue": "NPC说的话", "playerResponse": "玩家的简短回应"}
  ],
  "playerChoices": [
    {"id": "c1", "text": "选项描述", "consequence": "可能后果"},
    {"id": "c2", "text": "选项描述", "consequence": "可能后果"},
    {"id": "c3", "text": "选项描述", "consequence": "可能后果"},
    {"id": "c4", "text": "选项描述", "consequence": "可能后果"}
  ],
  "attributeChanges": {"talent": 0, "intelligence": 0, "physique": 0, "appearance": 0, "family": 0, "luck": 0},
  "newEvents": ["新事件简述1", "新事件简述2"],
  "narrativeHook": "一个吸引人的悬念或预告(20-35字)"
}`;
}

function buildMerchantSection(economic: EconomicState, chance: number): string {
  if (chance <= 0) return '';

  const tradableText = economic.tradableItems.length > 0
    ? economic.tradableItems.map((t) => `${t.name}(估值${t.estimatedValue}金)`).join('、')
    : '无可交易物品';

  return `【经济状态】
当前金币：${economic.gold}
持有可交易物品：${tradableText}

【随机事件可能性】本回合有${chance}%概率触发"行脚商人"事件。若触发，请在叙事中插入一位神秘商人，其出售物品需与玩家当前境况相关，价格合理，并提供购买选项(购买/讨价还价/不买离开)。`;
}

function buildArtifactSection(hints: ArtifactUsageHint[], artifacts: import('../types').Artifact[]): string {
  if (hints.length === 0) return '';

  const hintLines = hints.map((h) => {
    const artifact = artifacts.find((a) => a.id === h.artifactId);
    const canUse = artifact ? artifact.cooldown <= 0 : false;
    const status = canUse ? '可用' : `冷却中(${artifact?.cooldown || 0}回合)`;
    return `- ${h.artifactName}：${h.ability} | ${status} | 建议场景：${h.suggestedScene}`;
  }).join('\n');

  return `【道具互动铁律】
若玩家持有未在近期事件中使用过的逆天道具，你必须在接下来3回合内安排一个自然场景，让该道具发挥关键作用。使用道具时需明确描写其效果，让玩家切实感到它的强大。道具使用后记录冷却。

当前持有道具状态：
${hintLines}`;
}

export function parseStoryWeaverOutput(raw: string): StoryWeaverOutput {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: Partial<StoryWeaverOutput>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('无法解析剧情编织者输出');
    }
  }

  return {
    sceneDescription: parsed.sceneDescription || '你继续在这片土地上冒险...',
    systemDialogue: parsed.systemDialogue || '叮！系统运行正常。',
    npcInteractions: parsed.npcInteractions || [],
    playerChoices: parsed.playerChoices || [
      { id: 'c1', text: '继续前进', consequence: '探索未知区域' },
      { id: 'c2', text: '修炼提升', consequence: '稳步增长实力' },
      { id: 'c3', text: '搜寻资源', consequence: '获得物资补给' },
      { id: 'c4', text: '休息恢复', consequence: '恢复部分状态' },
    ],
    attributeChanges: parsed.attributeChanges || {},
    newEvents: parsed.newEvents || ['新的一天开始了'],
    narrativeHook: parsed.narrativeHook || '前方还有更多的冒险在等待...',
  };
}

export function generateFallbackOutput(context: NarrativeContext): StoryWeaverOutput {
  const { player } = context;
  const scene = getSceneById(player.progress.sceneType);

  return {
    sceneDescription: `${scene?.name || '未知世界'}的第${player.progress.round}回合。你继续在这片土地上冒险，周围充满了未知的机遇与挑战。远处隐约传来奇异的声音，似乎有什么在等待着你...`,
    systemDialogue: `叮！${player.system.name}系统运行正常。`,
    npcInteractions: [],
    playerChoices: [
      { id: 'c1', text: '探索前方', consequence: '可能发现新区域' },
      { id: 'c2', text: '修炼提升', consequence: '稳步增长实力' },
      { id: 'c3', text: '搜寻资源', consequence: '获得物资补给' },
      { id: 'c4', text: '休息恢复', consequence: '恢复部分生命值' },
    ],
    attributeChanges: {},
    newEvents: [`在${scene?.name || '未知世界'}中探索的第${player.progress.round}个回合`],
    narrativeHook: '前方的道路充满未知，每一个选择都可能改变命运...',
  };
}
