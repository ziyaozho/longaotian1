import type { Talent } from '../types';

const cultivationTalents: Talent[] = [
  {
    id: 'iron_body', name: '铁骨功', description: '肉身如钢铁般坚硬，防御大幅提升',
    category: 'body', worldTheme: 'cultivation', rarity: 'common',
    effects: { statBonus: { maxHp: 30, combatPower: 10 } },
    synergyTags: ['body', 'defense', 'martial'],
  },
  {
    id: 'flame_root', name: '烈焰灵根', description: '天生火属性灵根，火系功法威力提升',
    category: 'magic', worldTheme: 'cultivation', rarity: 'rare',
    effects: { attrBonus: { talent: 2 }, damageType: 'fire' },
    synergyTags: ['fire', 'spell', 'cultivation'],
  },
  {
    id: 'heaven_sword', name: '天剑诀', description: '御剑之术登峰造极，剑意通神',
    category: 'combat', worldTheme: 'cultivation', rarity: 'epic',
    effects: { statBonus: { combatPower: 50 }, attrBonus: { talent: 3 } },
    synergyTags: ['sword', 'spirit', 'wind', 'combat'],
  },
  {
    id: 'chaos_body', name: '混沌道体', description: '万古罕见的混沌体质，可容纳万法',
    category: 'body', worldTheme: 'cultivation', rarity: 'legendary',
    effects: { attrBonus: { talent: 5, physique: 3, luck: 2 }, statBonus: { combatPower: 80 } },
    synergyTags: ['chaos', 'void', 'creation', 'body'],
  },
  {
    id: 'swift_shadow', name: '疾影步', description: '身法如影，先手攻击概率提升',
    category: 'body', worldTheme: 'cultivation', rarity: 'common',
    effects: { statBonus: { combatPower: 8 } },
    synergyTags: ['speed', 'shadow', 'martial'],
  },
  {
    id: 'thunder_palm', name: '雷霆掌', description: '手掌凝聚雷电之力，近战附带麻痹',
    category: 'combat', worldTheme: 'cultivation', rarity: 'rare',
    effects: { statBonus: { combatPower: 30 }, damageType: 'lightning' },
    synergyTags: ['thunder', 'martial', 'combat'],
  },
  {
    id: 'ice_soul', name: '冰魄玄功', description: '极寒之力凝聚魂魄，免疫火系减益',
    category: 'magic', worldTheme: 'cultivation', rarity: 'rare',
    effects: { attrBonus: { intelligence: 2 }, damageType: 'ice' },
    synergyTags: ['ice', 'soul', 'spell'],
  },
  {
    id: 'divine_pill_master', name: '丹圣天赋', description: '炼丹成功率翻倍，丹药效果+50%',
    category: 'craft', worldTheme: 'cultivation', rarity: 'epic',
    effects: { attrBonus: { intelligence: 3, luck: 2 } },
    synergyTags: ['craft', 'fire', 'cultivation'],
  },
  {
    id: 'sword_immortal', name: '剑仙转世', description: '前世为剑仙，剑类武器伤害×2',
    category: 'combat', worldTheme: 'cultivation', rarity: 'legendary',
    effects: { statBonus: { combatPower: 100 }, attrBonus: { talent: 4, appearance: 2 } },
    synergyTags: ['sword', 'spirit', 'immortal', 'combat'],
  },
  {
    id: 'dragon_blood', name: '真龙血脉', description: '体内流淌真龙之血，全属性提升',
    category: 'body', worldTheme: 'cultivation', rarity: 'legendary',
    effects: { attrBonus: { talent: 3, physique: 3, intelligence: 2 }, statBonus: { maxHp: 60, combatPower: 60 } },
    synergyTags: ['dragon', 'blood', 'body', 'mythic'],
  },
];

const modernTalents: Talent[] = [
  {
    id: 'street_smart', name: '街头智慧', description: '在城市环境中洞察隐藏信息和机会',
    category: 'mind', worldTheme: 'modern_city', rarity: 'common',
    effects: { attrBonus: { intelligence: 1, luck: 1 } },
    synergyTags: ['sense', 'social', 'urban'],
  },
  {
    id: 'hacker_mind', name: '黑客思维', description: '可破解电子系统获取情报和资源',
    category: 'mind', worldTheme: 'modern_city', rarity: 'rare',
    effects: { attrBonus: { intelligence: 3 }, statBonus: { wealth: 100 } },
    synergyTags: ['tech', 'mind', 'hack'],
  },
  {
    id: 'silver_tongue', name: '三寸不烂', description: '说服力极强，社交选项成功率提升',
    category: 'social', worldTheme: 'modern_city', rarity: 'rare',
    effects: { attrBonus: { appearance: 2, family: 2 } },
    synergyTags: ['social', 'speech', 'charm'],
  },
  {
    id: 'corporate_king', name: '商业帝国', description: '拥有跨国公司资源，财富获取×3',
    category: 'social', worldTheme: 'modern_city', rarity: 'epic',
    effects: { attrBonus: { family: 5 }, statBonus: { wealth: 500 } },
    synergyTags: ['wealth', 'social', 'power'],
  },
  {
    id: 'urban_ninja', name: '都市忍者', description: '身怀古武秘术的现代刺客',
    category: 'combat', worldTheme: 'modern_city', rarity: 'epic',
    effects: { statBonus: { combatPower: 40 }, attrBonus: { physique: 2 } },
    synergyTags: ['stealth', 'martial', 'shadow'],
  },
];

const urbanFantasyTalents: Talent[] = [
  {
    id: 'spirit_eye', name: '灵视', description: '可看见常人不可见的灵体和能量流动',
    category: 'mind', worldTheme: 'urban_fantasy', rarity: 'common',
    effects: { attrBonus: { intelligence: 2, luck: 1 } },
    synergyTags: ['spirit', 'sense', 'magic'],
  },
  {
    id: 'blood_magic', name: '血族契约', description: '与血族缔结契约，获得吸血回复能力',
    category: 'magic', worldTheme: 'urban_fantasy', rarity: 'rare',
    effects: { statBonus: { maxHp: 40, combatPower: 20 } },
    synergyTags: ['blood', 'dark', 'magic'],
  },
  {
    id: 'rune_master', name: '符文大师', description: '精通古代符文技术，可增幅装备效果',
    category: 'craft', worldTheme: 'urban_fantasy', rarity: 'epic',
    effects: { attrBonus: { intelligence: 3, talent: 2 } },
    synergyTags: ['rune', 'craft', 'ancient', 'magic'],
  },
  {
    id: 'fate_weaver', name: '命运编织者', description: '可有限度感知和编织命运之线',
    category: 'luck', worldTheme: 'urban_fantasy', rarity: 'legendary',
    effects: { attrBonus: { luck: 5, talent: 3 } },
    synergyTags: ['fate', 'weave', 'luck', 'divine'],
  },
];

const apocalypseTalents: Talent[] = [
  {
    id: 'survival_instinct', name: '生存本能', description: '在绝境中感知危险和资源',
    category: 'body', worldTheme: 'apocalypse', rarity: 'common',
    effects: { attrBonus: { physique: 2 }, statBonus: { maxHp: 20 } },
    synergyTags: ['survival', 'sense', 'body'],
  },
  {
    id: 'scavenger', name: '废墟拾荒者', description: '在废墟中发现隐藏物资的概率翻倍',
    category: 'luck', worldTheme: 'apocalypse', rarity: 'common',
    effects: { attrBonus: { luck: 2 }, statBonus: { wealth: 50 } },
    synergyTags: ['loot', 'survival', 'luck'],
  },
  {
    id: 'gene_mutate', name: '基因突变', description: '辐射导致的良性基因变异，自愈能力',
    category: 'body', worldTheme: 'apocalypse', rarity: 'rare',
    effects: { statBonus: { maxHp: 50, combatPower: 15 } },
    synergyTags: ['body', 'mutate', 'adapt'],
  },
  {
    id: 'wasteland_lord', name: '废土领主', description: '统领废土幸存者聚落，号召力极强',
    category: 'social', worldTheme: 'apocalypse', rarity: 'epic',
    effects: { attrBonus: { family: 4, appearance: 2 }, statBonus: { wealth: 200 } },
    synergyTags: ['social', 'power', 'leader'],
  },
  {
    id: 'time_rewind', name: '时间回溯', description: '可回溯时间 5 秒，规避致命伤害',
    category: 'mind', worldTheme: 'apocalypse', rarity: 'legendary',
    effects: { attrBonus: { talent: 5, luck: 3 }, statBonus: { combatPower: 70 } },
    synergyTags: ['time', 'rewind', 'mind', 'god'],
  },
];

const apocFantasyTalents: Talent[] = [
  {
    id: 'dark_vision', name: '暗夜视野', description: '在黑暗中视物如昼',
    category: 'body', worldTheme: 'apoc_fantasy', rarity: 'common',
    effects: { attrBonus: { physique: 1, intelligence: 1 } },
    synergyTags: ['dark', 'sense', 'body'],
  },
  {
    id: 'demon_arm', name: '魔化手臂', description: '一只手臂被恶魔之力侵蚀，战力大增',
    category: 'combat', worldTheme: 'apoc_fantasy', rarity: 'rare',
    effects: { statBonus: { combatPower: 35 }, damageType: 'dark' },
    synergyTags: ['demon', 'dark', 'combat'],
  },
  {
    id: 'light_bringer', name: '光明使者', description: '在黑暗中点燃希望之光，免疫暗系伤害',
    category: 'magic', worldTheme: 'apoc_fantasy', rarity: 'epic',
    effects: { attrBonus: { talent: 3, luck: 2 }, statBonus: { combatPower: 40 } },
    synergyTags: ['light', 'holy', 'magic'],
  },
  {
    id: 'apocalypse_rider', name: '天启骑士', description: '末日预言中的骑士之力',
    category: 'combat', worldTheme: 'apoc_fantasy', rarity: 'legendary',
    effects: { attrBonus: { talent: 4, physique: 4 }, statBonus: { combatPower: 90 } },
    synergyTags: ['apocalypse', 'divine', 'combat', 'mythic'],
  },
];

const hiddenImmortalTalents: Talent[] = [
  {
    id: 'old_immortal', name: '隐世老者', description: '被隐居仙人指点，修炼速度+30%',
    category: 'mind', worldTheme: 'hidden_immortal', rarity: 'common',
    effects: { attrBonus: { talent: 2 }, statBonus: { exp: 50 } },
    synergyTags: ['immortal', 'wisdom', 'hidden'],
  },
  {
    id: 'immortal_body', name: '仙人体', description: '经过仙气淬炼的身体，寿命延长',
    category: 'body', worldTheme: 'hidden_immortal', rarity: 'rare',
    effects: { statBonus: { maxHp: 60 }, attrBonus: { physique: 3 } },
    synergyTags: ['immortal', 'body', 'holy'],
  },
  {
    id: 'fairy_art', name: '仙法通玄', description: '掌握失传的上古仙术',
    category: 'magic', worldTheme: 'hidden_immortal', rarity: 'epic',
    effects: { attrBonus: { intelligence: 4, talent: 3 } },
    synergyTags: ['immortal', 'spell', 'ancient', 'magic'],
  },
  {
    id: 'dao_ancestor', name: '道祖印记', description: '身负道祖印记，万法不侵',
    category: 'luck', worldTheme: 'hidden_immortal', rarity: 'legendary',
    effects: { attrBonus: { talent: 5, luck: 4, intelligence: 3 }, statBonus: { combatPower: 100 } },
    synergyTags: ['dao', 'divine', 'luck', 'creation'],
  },
];

const hiddenCyberTalents: Talent[] = [
  {
    id: 'cyber_eye', name: '义眼改造', description: '改装过的电子义眼，可分析目标数据',
    category: 'mind', worldTheme: 'hidden_cyber', rarity: 'common',
    effects: { attrBonus: { intelligence: 2 } },
    synergyTags: ['tech', 'sense', 'cyber'],
  },
  {
    id: 'neural_link', name: '神经链接', description: '大脑直连网络，信息处理速度×10',
    category: 'mind', worldTheme: 'hidden_cyber', rarity: 'rare',
    effects: { attrBonus: { intelligence: 4, talent: 1 } },
    synergyTags: ['tech', 'mind', 'hack'],
  },
  {
    id: 'nano_armor', name: '纳米装甲', description: '皮下植入纳米装甲，自动防御物理攻击',
    category: 'body', worldTheme: 'hidden_cyber', rarity: 'epic',
    effects: { statBonus: { maxHp: 70, combatPower: 45 } },
    synergyTags: ['tech', 'body', 'nano', 'defense'],
  },
  {
    id: 'ai_fusion', name: 'AI融合', description: '与超级AI深度融合，预知短期未来',
    category: 'mind', worldTheme: 'hidden_cyber', rarity: 'legendary',
    effects: { attrBonus: { intelligence: 5, talent: 3, luck: 2 }, statBonus: { combatPower: 70 } },
    synergyTags: ['ai', 'tech', 'mind', 'future'],
  },
];

const hiddenDemonTalents: Talent[] = [
  {
    id: 'demon_blood', name: '魔族血统', description: '体内有稀薄魔族血脉，愤怒时战力暴增',
    category: 'body', worldTheme: 'hidden_demon', rarity: 'common',
    effects: { statBonus: { combatPower: 15 } },
    synergyTags: ['demon', 'blood', 'body'],
  },
  {
    id: 'dark_pact', name: '黑暗契约', description: '与深渊存在订立契约，获得暗影之力',
    category: 'magic', worldTheme: 'hidden_demon', rarity: 'rare',
    effects: { attrBonus: { talent: 2, luck: -1 }, statBonus: { combatPower: 40 }, damageType: 'dark' },
    synergyTags: ['dark', 'pact', 'magic'],
  },
  {
    id: 'abyss_lord', name: '深渊领主', description: '深渊位面的领主血脉，统御魔物',
    category: 'social', worldTheme: 'hidden_demon', rarity: 'epic',
    effects: { attrBonus: { family: 4, talent: 3 }, statBonus: { combatPower: 50 } },
    synergyTags: ['abyss', 'demon', 'power', 'social'],
  },
  {
    id: 'demon_god', name: '魔神转世', description: '上古魔神的轮回转世，潜力无限',
    category: 'combat', worldTheme: 'hidden_demon', rarity: 'legendary',
    effects: { attrBonus: { talent: 5, physique: 4 }, statBonus: { combatPower: 110 } },
    synergyTags: ['demon', 'god', 'combat', 'mythic', 'destruction'],
  },
];

export const ALL_TALENTS: Talent[] = [
  ...cultivationTalents,
  ...modernTalents,
  ...urbanFantasyTalents,
  ...apocalypseTalents,
  ...apocFantasyTalents,
  ...hiddenImmortalTalents,
  ...hiddenCyberTalents,
  ...hiddenDemonTalents,
];

export const TALENTS_BY_WORLD: Record<string, Talent[]> = {
  cultivation: cultivationTalents,
  modern_city: modernTalents,
  urban_fantasy: urbanFantasyTalents,
  apocalypse: apocalypseTalents,
  apoc_fantasy: apocFantasyTalents,
  hidden_immortal: hiddenImmortalTalents,
  hidden_cyber: hiddenCyberTalents,
  hidden_demon: hiddenDemonTalents,
};
