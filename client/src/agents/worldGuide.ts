import type { Attributes, SceneType, Player, Talent } from '../types';
import type { WorldRecommendation, WorldFitnessScore, WorldShiftSignal } from './types';
import { SCENES } from '../data/scenes';

interface WorldProfile {
  id: SceneType;
  name: string;
  primaryAttr: keyof Attributes;
  secondaryAttr: keyof Attributes;
  antiAttr: keyof Attributes;
  description: string;
  invitationTemplates: string[];
}

const WORLD_PROFILES: WorldProfile[] = [
  {
    id: 'modern_city',
    name: '现代都市',
    primaryAttr: 'intelligence',
    secondaryAttr: 'family',
    antiAttr: 'talent',
    description: '智力与魅力主导，适合商战、学术、娱乐圈',
    invitationTemplates: [
      '钢筋水泥的丛林中，智者靠头脑赢得一切。你的{strength}正是这座城市最需要的货币——欢迎来到现代都市。',
      '霓虹灯下暗流涌动，商界精英与地下王者共存。以你的{strength}，这座不夜城将为你点亮。',
    ],
  },
  {
    id: 'cultivation',
    name: '修仙世界',
    primaryAttr: 'talent',
    secondaryAttr: 'physique',
    antiAttr: 'family',
    description: '天赋与力量为王，充满修炼与奇遇',
    invitationTemplates: [
      '灵气充沛的大陆上，凡人亦可飞天遁地。你的{strength}将在这片土地上绽放光芒——修仙世界在召唤。',
      '宗门林立，妖兽横行。拥有{strength}的你，注定要在这修仙之路上留下不朽传说。',
    ],
  },
  {
    id: 'urban_fantasy',
    name: '都市玄幻',
    primaryAttr: 'talent',
    secondaryAttr: 'intelligence',
    antiAttr: 'physique',
    description: '灵气复苏的现代都市，古武与科技碰撞',
    invitationTemplates: [
      '当古老的修炼体系遇上现代科技，你的{strength}将成为连接两个世界的桥梁——欢迎来到都市玄幻。',
      '在这座灵气复苏的城市中，古武者与异能者共存。你的{strength}足以让你脱颖而出。',
    ],
  },
  {
    id: 'apocalypse',
    name: '末世降临',
    primaryAttr: 'physique',
    secondaryAttr: 'luck',
    antiAttr: 'family',
    description: '体力与生存技巧至上，人性与资源的考验',
    invitationTemplates: [
      '文明崩塌，丧尸横行。在末世中，你的{strength}是活下去的唯一资本——末世降临，准备好了吗？',
      '废墟之上，强者为王。以你的{strength}，你将成为幸存者们的希望之光。',
    ],
  },
  {
    id: 'apoc_fantasy',
    name: '末世玄幻',
    primaryAttr: 'physique',
    secondaryAttr: 'talent',
    antiAttr: 'family',
    description: '末世废墟中的修炼之路，辐射与灵气共生',
    invitationTemplates: [
      '当末日降临遇上天地法则改变，你的{strength}将成为废土上的传奇——末世玄幻在等待。',
      '辐射区中灵气更加浓郁，变异妖兽的晶核是最强的丹药。你的{strength}将在这里得到最极致的淬炼。',
    ],
  },
  {
    id: 'hidden_immortal',
    name: '洪荒世界',
    primaryAttr: 'talent',
    secondaryAttr: 'physique',
    antiAttr: 'family',
    description: '先天神魔并存的洪荒时代，最原始也最强大的修炼世界',
    invitationTemplates: [
      '天地初开，圣位空缺。你的{strength}在这个时代足以与先天神魔争锋——洪荒世界，等你开天辟地。',
      '紫霄宫的道音犹在，不周山的威严未倒。以你的{strength}，在这洪荒之中留下你的名号吧。',
    ],
  },
  {
    id: 'hidden_cyber',
    name: '赛博修仙',
    primaryAttr: 'intelligence',
    secondaryAttr: 'talent',
    antiAttr: 'appearance',
    description: '意识上传、机械飞升与灵能修炼共存的未来世界',
    invitationTemplates: [
      '神经网络中的灵力流动，量子计算机里的功法推演。你的{strength}是最强的算力——欢迎来到赛博修仙。',
      '当义体成为法宝，当数据成为灵气，你的{strength}将改写这个世界的代码。',
    ],
  },
  {
    id: 'hidden_demon',
    name: '魔神纪元',
    primaryAttr: 'physique',
    secondaryAttr: 'talent',
    antiAttr: 'luck',
    description: '深渊入侵，魔气弥漫，以魔证道的黑暗世界',
    invitationTemplates: [
      '深渊的低语在召唤，魔气的力量在沸腾。你的{strength}正是以魔证道的最佳根基——魔神纪元，敢来吗？',
      '正道衰落，魔道昌盛。在这个黑暗的时代，你的{strength}将决定你是猎人还是猎物。',
    ],
  },
];

function calcFitness(attributes: Attributes, profile: WorldProfile): number {
  const primary = attributes[profile.primaryAttr];
  const secondary = attributes[profile.secondaryAttr];
  const anti = attributes[profile.antiAttr];

  let score = primary * 15 + secondary * 8 - anti * 3;

  // Bonus for extreme specialization
  if (primary >= 7) score += 20;
  if (primary >= 9) score += 15;

  // Penalty for very low relevant stats
  if (primary <= 3) score -= 30;
  if (secondary <= 3) score -= 10;

  return Math.max(0, score);
}

function getTopAttribute(attributes: Attributes): string {
  const entries = Object.entries(attributes) as [keyof Attributes, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || 'talent';
}

function getAttrName(attr: keyof Attributes): string {
  const names: Record<keyof Attributes, string> = {
    talent: '天赋',
    appearance: '外貌',
    intelligence: '智力',
    physique: '体质',
    family: '家世',
    luck: '运气',
  };
  return names[attr];
}

export function recommendWorld(
  attributes: Attributes,
  _talents: Talent[],
): WorldRecommendation {
  const available = WORLD_PROFILES.filter((p) => {
    const scene = SCENES.find((s) => s.id === p.id);
    return scene && !scene.unlockRequirement;
  });

  const scored: WorldFitnessScore[] = available.map((p) => ({
    world: p.id,
    score: calcFitness(attributes, p),
  }));

  scored.sort((a, b) => b.score - a.score);

  const top = WORLD_PROFILES.find((p) => p.id === scored[0].world)!;
  const topAttr = getTopAttribute(attributes);
  const attrName = getAttrName(topAttr);

  const invitationTemplate = randomPick(top.invitationTemplates);
  const invitation = invitationTemplate.replace('{strength}', attrName);

  return {
    recommendedWorld: top.id,
    reason: `你的${attrName}(${attributes[topAttr]})最为突出，最适合在「${top.name}」中大展身手。${top.description}。`,
    invitationText: invitation,
    alternativeWorlds: scored.slice(1, 3).map((s) => s.world),
  };
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function evaluateWorldShift(
  player: Player,
  _currentWorld: SceneType,
): WorldShiftSignal | null {
  if (player.progress.round % 10 !== 0 && !hasAttributeBreakthrough(player)) {
    return null;
  }

  const currentProfile = WORLD_PROFILES.find((p) => p.id === player.progress.sceneType);
  if (!currentProfile) return null;

  const available = WORLD_PROFILES.filter(
    (p) => p.id !== player.progress.sceneType,
  );

  const scored: WorldFitnessScore[] = available.map((p) => ({
    world: p.id,
    score: calcFitness(player.attributes, p),
  }));

  scored.sort((a, b) => b.score - a.score);

  const currentScore = calcFitness(player.attributes, currentProfile);
  const bestAlt = scored[0];

  if (!bestAlt || bestAlt.score <= currentScore * 1.2) {
    return null;
  }

  const target = WORLD_PROFILES.find((p) => p.id === bestAlt.world)!;

  const shiftIdeas = [
    `在一次战斗中，空间裂缝突然打开，将主角吸入其中，醒来时发现身处「${target.name}」的领域。`,
    `突破的瞬间，天道降下异象——世界通道在主角面前缓缓开启，另一端的「${target.name}」散发出强烈的吸引力。`,
    `一场意外让主角的灵力属性发生了根本改变，与当前世界产生了排斥，而与「${target.name}」产生了共鸣。`,
  ];

  return {
    shouldShift: true,
    targetWorld: bestAlt.world,
    shiftEventIdea: randomPick(shiftIdeas),
  };
}

function hasAttributeBreakthrough(player: Player): boolean {
  for (const attr of Object.keys(player.attributes) as (keyof Attributes)[]) {
    if (player.attributes[attr] >= 8 && player.progress.storyFlags.includes(`bt_${attr}`)) {
      continue;
    }
    if (player.attributes[attr] >= 8) {
      return true;
    }
  }
  return false;
}
