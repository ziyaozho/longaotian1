import type { Player, Attributes, SceneType } from '../types';
import type { EndingPrototype, EndingCondition, EndingEvaluation } from './types';

type EndingArchetype = 'hermit' | 'conqueror' | 'sage' | 'tragic_hero' | 'transcendent';

const ARCHETYPE_POOLS: Record<EndingArchetype, {
  namePatterns: string[];
  descriptionPatterns: string[];
  conditionTemplates: Partial<EndingCondition>[];
}> = {
  hermit: {
    namePatterns: ['隐世高人', '世外仙踪', '归隐之路', '红尘之外'],
    descriptionPatterns: [
      '看破红尘，归隐山林，在平静中了却余生。',
      '厌倦了争斗与算计，选择远离尘嚣，自在于天地之间。',
    ],
    conditionTemplates: [
      { type: 'attribute', targetAttribute: 'intelligence', targetValue: 70, description: '智力达到70以上（看破世事）' },
      { type: 'event', eventDescription: '经历一次重大背叛或失落', description: '经历重大变故后选择归隐' },
      { type: 'attribute', targetAttribute: 'talent', targetValue: 50, description: '天赋达到50（有归隐的资本）' },
    ],
  },
  conqueror: {
    namePatterns: ['霸者天下', '万界之主', '征服之路', '王者降临'],
    descriptionPatterns: [
      '以无上武力征服诸界，成为万界共主，建立不朽王朝。',
      '一路披荆斩棘，最终站在世界之巅，俯瞰众生。',
    ],
    conditionTemplates: [
      { type: 'attribute', targetAttribute: 'physique', targetValue: 80, description: '体质达到80（无双战力）' },
      { type: 'event', eventDescription: '击败至少5个世界的主要敌人', description: '征战多界，未尝败绩' },
      { type: 'attribute', targetAttribute: 'talent', targetValue: 60, description: '天赋达到60（统治者的资质）' },
      { type: 'collection', itemType: 'legendary', requiredCount: 2, description: '获得至少2件传说级物品' },
      { type: 'artifact', targetArtifactId: 'realm_breaker', targetUpgradeLevel: 3, description: '破界珠升级至可跨界旅行' },
    ],
  },
  sage: {
    namePatterns: ['智者之路', '天机参透', '大道明悟', '万法归一'],
    descriptionPatterns: [
      '参透宇宙真理，洞悉天道运行，以智慧超脱轮回。',
      '在无尽的知识海洋中找到了终极答案，成为智慧的化身。',
    ],
    conditionTemplates: [
      { type: 'attribute', targetAttribute: 'intelligence', targetValue: 90, description: '智力达到90（参透天机）' },
      { type: 'attribute', targetAttribute: 'talent', targetValue: 70, description: '天赋达到70（悟性超凡）' },
      { type: 'social', targetValue: 3, description: '与至少3个世界的智者结交' },
    ],
  },
  tragic_hero: {
    namePatterns: ['悲剧英雄', '宿命轮回', '牺牲之路', '最后的守护者'],
    descriptionPatterns: [
      '为了守护重要之人牺牲自我，虽身死而名不朽。',
      '明知不可为而为之，以生命换取世界的存续。',
    ],
    conditionTemplates: [
      { type: 'attribute', targetAttribute: 'physique', targetValue: 60, description: '体质达到60（有牺牲的资本）' },
      { type: 'event', eventDescription: '与至少2个NPC建立深厚羁绊', description: '有了值得守护的人' },
      { type: 'social', targetValue: 2, description: '与至少2名NPC好感达到80' },
    ],
  },
  transcendent: {
    namePatterns: ['超越彼岸', '破碎虚空', '终极觉醒', '无量天尊'],
    descriptionPatterns: [
      '突破了世界的极限，超越了生死的束缚，达到了前所未有的境界。',
      '打破天道的桎梏，成为超脱一切的存在。',
    ],
    conditionTemplates: [
      { type: 'attribute', targetAttribute: 'talent', targetValue: 90, description: '天赋达到90（绝顶资质）' },
      { type: 'attribute', targetAttribute: 'intelligence', targetValue: 80, description: '智力达到80（悟透天道）' },
      { type: 'attribute', targetAttribute: 'physique', targetValue: 70, description: '体质达到70（承载超脱之力）' },
      { type: 'collection', itemType: 'legendary', requiredCount: 3, description: '获得至少3件传说级物品' },
      { type: 'event', eventDescription: '经历世界转换', description: '至少经历一次世界切换' },
      { type: 'artifact', targetArtifactId: 'small_green_bottle', targetUpgradeLevel: 4, description: '小绿瓶升级至可催熟万年灵药' },
      { type: 'artifact', targetArtifactId: 'fate_wheel', targetUpgradeLevel: 2, description: '命运轮盘升级至可影响他人命运' },
    ],
  },
};

function pickArchetype(attributes: Attributes): EndingArchetype {
  const { talent, physique, intelligence, luck } = attributes;

  if (talent >= 8 && intelligence >= 6) return 'transcendent';
  if (physique >= 7 && talent >= 5) return 'conqueror';
  if (intelligence >= 7 && talent >= 5) return 'sage';
  if (physique >= 6 && luck <= 4) return 'tragic_hero';
  return 'hermit';
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateEndingPrototype(
  attributes: Attributes,
  _world: SceneType,
): EndingPrototype {
  const archetype = pickArchetype(attributes);
  const pool = ARCHETYPE_POOLS[archetype];

  const name = randomPick(pool.namePatterns);
  const description = randomPick(pool.descriptionPatterns);

  const conditions: EndingCondition[] = pool.conditionTemplates.map((tpl, i) => ({
    id: `cond_${archetype}_${i}`,
    description: tpl.description || `条件${i + 1}`,
    type: tpl.type || 'attribute',
    targetAttribute: tpl.targetAttribute,
    targetValue: tpl.targetValue,
    eventDescription: tpl.eventDescription,
    itemType: tpl.itemType,
    requiredCount: tpl.requiredCount,
    progress: 0,
    isStillPossible: true,
  }));

  return {
    endingId: `ending_${archetype}_${Date.now()}`,
    name,
    description,
    conditions,
    overallFeasibility: 50,
    isStillPossible: true,
  };
}

export function evaluateEnding(
  prototype: EndingPrototype,
  player: Player,
): EndingEvaluation {
  const conditionProgress: Record<string, number> = {};
  let allPossible = true;

  for (const cond of prototype.conditions) {
    if (!cond.isStillPossible) {
      conditionProgress[cond.id] = 0;
      continue;
    }

    let progress = 0;

    switch (cond.type) {
      case 'attribute': {
        if (cond.targetAttribute && cond.targetValue) {
          const currentVal = player.attributes[cond.targetAttribute];
          progress = Math.min(100, Math.floor((currentVal / cond.targetValue) * 100));
        }
        break;
      }
      case 'event': {
        progress = cond.progress;
        break;
      }
      case 'collection': {
        if (cond.itemType && cond.requiredCount) {
          const count = player.inventory.filter(
            (i) => i.rarity === cond.itemType,
          ).length + player.achievements.filter(
            (a) => a.includes(cond.itemType || ''),
          ).length;
          progress = Math.min(100, Math.floor((count / cond.requiredCount) * 100));
        }
        break;
      }
      case 'social': {
        if (cond.targetValue) {
          const highAffectionCount = Object.values(player.npcStatuses).filter(
            (npc) => npc.alive && npc.affection >= 80,
          ).length;
          progress = Math.min(100, Math.floor((highAffectionCount / cond.targetValue) * 100));
        }
        break;
      }
      case 'artifact': {
        if (cond.targetArtifactId && cond.targetUpgradeLevel) {
          const artifact = player.artifacts.find((a) => a.id === cond.targetArtifactId);
          if (artifact) {
            progress = Math.min(100, Math.floor((artifact.upgradeLevel / cond.targetUpgradeLevel) * 100));
          }
        }
        break;
      }
    }

    conditionProgress[cond.id] = progress;

    if (progress < 5 && cond.type === 'social') {
      cond.isStillPossible = Object.values(player.npcStatuses).some((n) => n.alive);
    }
  }

  const overallFeasibility = Math.floor(
    Object.values(conditionProgress).reduce((a, b) => a + b, 0) /
      Math.max(1, Object.values(conditionProgress).length),
  );

  const narrativeHint = buildNarrativeHint(prototype, conditionProgress, player);

  return {
    conditionProgress,
    overallFeasibility,
    isStillPossible: allPossible && overallFeasibility > 5,
    narrativeHint,
  };
}

function buildNarrativeHint(
  prototype: EndingPrototype,
  progress: Record<string, number>,
  _player: Player,
): string {
  const lowestCond = prototype.conditions
    .filter((c) => c.isStillPossible)
    .sort((a, b) => (progress[a.id] || 0) - (progress[b.id] || 0))[0];

  if (!lowestCond) {
    return '前路已断，但命运总有转机...';
  }

  const prog = progress[lowestCond.id] || 0;

  if (prog < 30) {
    return `需要更多地关注「${lowestCond.description}」。`;
  }
  if (prog < 60) {
    return `「${lowestCond.description}」已有进展，但仍需努力。`;
  }
  if (prog < 90) {
    return `「${lowestCond.description}」接近完成，继续坚持。`;
  }
  return '命运的齿轮正在向最终的结局转动...';
}

export function mutateCondition(
  prototype: EndingPrototype,
  failedConditionId: string,
): EndingPrototype {
  const idx = prototype.conditions.findIndex((c) => c.id === failedConditionId);
  if (idx === -1) return prototype;

  const old = prototype.conditions[idx];
  const alternatives: Partial<EndingCondition>[] = [
    { type: 'attribute', targetAttribute: 'luck', targetValue: 50, description: '以运气弥补失去的机缘（运气达到50）' },
    { type: 'collection', itemType: 'epic', requiredCount: 2, description: '获得至少2件史诗级物品作为替代' },
    { type: 'attribute', targetAttribute: 'talent', targetValue: 75, description: '天赋达到75（以天资弥补缺憾）' },
    { type: 'artifact', targetArtifactId: 'memory_book', targetUpgradeLevel: 3, description: '记忆之书升级至可预知未来作为替代' },
  ];

  const alt = alternatives.find((a) =>
    !prototype.conditions.some((c) => c.description === a.description),
  ) || alternatives[0];

  const newConditions = [...prototype.conditions];
  newConditions[idx] = {
    id: `${old.id}_mutated_${Date.now()}`,
    description: alt.description || '替代条件',
    type: alt.type || 'attribute',
    targetAttribute: alt.targetAttribute,
    targetValue: alt.targetValue,
    itemType: alt.itemType,
    requiredCount: alt.requiredCount,
    progress: 0,
    isStillPossible: true,
  };

  return {
    ...prototype,
    conditions: newConditions,
  };
}
