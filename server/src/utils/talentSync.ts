import type { Talent, SynergyLink } from '../types';

const COMBO_NAME_POOL: Record<string, string[]> = {
  fire: ['烈焰', '炎', '焚天', '灼'],
  ice: ['冰霜', '寒', '极寒', '冻'],
  thunder: ['雷霆', '雷', '紫电', '轰'],
  sword: ['剑', '刃', '斩', '锋'],
  body: ['金刚', '不坏', '铁壁', '磐石'],
  magic: ['奥术', '秘法', '玄', '灵'],
  tech: ['科技', '机械', '电子', '数码'],
  demon: ['魔', '暗', '深渊', '邪'],
  immortal: ['仙', '道', '圣', '神'],
  blood: ['血', '命', '魂', '祭'],
  dragon: ['龙', '真龙', '天龙', '神龙'],
  chaos: ['混沌', '虚无', '太初', '洪荒'],
  time: ['时光', '永恒', '刹那', '轮回'],
  luck: ['天命', '命运', '气运', '造化'],
  mind: ['心灵', '意志', '神念', '慧'],
  social: ['王', '帝', '尊', '君'],
};

function pickComboName(tags: string[]): string {
  for (const tag of tags) {
    const pool = COMBO_NAME_POOL[tag];
    if (pool) return pool[Math.floor(Math.random() * pool.length)];
  }
  return '无双';
}

export function calcSynergies(talents: Talent[]): SynergyLink[] {
  const links: SynergyLink[] = [];
  if (talents.length < 2) return links;

  for (let i = 0; i < talents.length; i++) {
    for (let j = i + 1; j < talents.length; j++) {
      const a = talents[i];
      const b = talents[j];
      const commonTags = a.synergyTags.filter((t) => b.synergyTags.includes(t));
      if (commonTags.length === 0) continue;

      const strength =
        commonTags.length >= 3 ? 'legendary' :
        commonTags.length >= 2 ? 'strong' :
        'weak';

      links.push({
        talentA: a.id,
        talentB: b.id,
        commonTags,
        strength,
        comboName: `${pickComboName(commonTags)}${['·', '之', ''][commonTags.length % 3]}`,
      });
    }
  }
  return links;
}

export function calcSynergyBonus(links: SynergyLink[]): {
  attrMultiplier: number;
  statMultiplier: number;
  hasTrinity: boolean;
} {
  if (links.length === 0) return { attrMultiplier: 1, statMultiplier: 1, hasTrinity: false };

  let totalStrength = 0;
  for (const link of links) {
    totalStrength += link.strength === 'legendary' ? 3 : link.strength === 'strong' ? 2 : 1;
  }

  const multiplier = 1 + totalStrength * 0.2;

  // 三位一体：3 个天赋两两协同
  const hasTrinity = links.length >= 3;

  return {
    attrMultiplier: hasTrinity ? multiplier + 0.15 : multiplier,
    statMultiplier: multiplier,
    hasTrinity,
  };
}

export function applyTalentEffects(talents: Talent[]): {
  attrBonus: Partial<Record<string, number>>;
  statBonus: Partial<Record<string, number>>;
} {
  const attrBonus: Record<string, number> = {};
  const statBonus: Record<string, number> = {};

  for (const talent of talents) {
    const e = talent.effects;
    if (e.attrBonus) {
      for (const [k, v] of Object.entries(e.attrBonus)) {
        attrBonus[k] = (attrBonus[k] || 0) + (v as number);
      }
    }
    if (e.statBonus) {
      for (const [k, v] of Object.entries(e.statBonus)) {
        statBonus[k] = (statBonus[k] || 0) + (v as number);
      }
    }
  }

  return { attrBonus, statBonus };
}

export function selectTalentChoices(
  playerAttr: { talent: number; luck: number },
  worldTheme: string,
  existingIds: string[],
  pool: Talent[],
): Talent[] {
  const worldPool = pool.filter(
    (t) => t.worldTheme === worldTheme && !existingIds.includes(t.id),
  );
  const globalPool = pool.filter(
    (t) => !existingIds.includes(t.id),
  );

  const results: Talent[] = [];

  // 2 个来自当前世界观
  const shuffledWorld = [...worldPool].sort(() => Math.random() - 0.5);
  const worldCount = Math.min(2, shuffledWorld.length);
  for (let i = 0; i < worldCount; i++) {
    results.push(shuffledWorld[i]);
  }

  // 1 个来自全池（排除已选）
  const usedIds = results.map((t) => t.id);
  const remainingPool = globalPool.filter((t) => !usedIds.includes(t.id));
  const shuffledGlobal = [...remainingPool].sort(() => Math.random() - 0.5);
  if (shuffledGlobal.length > 0) {
    results.push(shuffledGlobal[0]);
  }

  // 稀有度加权：高属性提升高稀有度概率
  const luckFactor = (playerAttr.talent + playerAttr.luck) / 20; // 0-1
  return results.sort(() => Math.random() - 0.5).sort((a, b) => {
    const rarityRank = { common: 0, rare: 1, epic: 2, legendary: 3 };
    const aScore = rarityRank[a.rarity] * (0.5 + luckFactor);
    const bScore = rarityRank[b.rarity] * (0.5 + luckFactor);
    return bScore - aScore;
  });
}

export function getSynergyStrengthColor(strength: 'weak' | 'strong' | 'legendary'): string {
  return strength === 'legendary' ? '#f39c12'
    : strength === 'strong' ? '#8e44ad'
    : '#7f8c8d';
}
