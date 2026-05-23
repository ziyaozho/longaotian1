# 天赋特质系统 + 协同系统 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现天赋特质系统与协同系统 — 玩家 5 级时三选一天赋、后续剧情获取、天赋间标签匹配形成协同加成。

**架构：** 天赋数据存储在 `src/data/talents.ts`（~110 条），协同计算在 `src/utils/talentSync.ts`（纯函数），三选一 UI 在 `TalentSelect.tsx`（模态弹窗），集成点通过 `TurnResult.talentChoice` 字段和 `playerStore.addTalent()` 方法连接。

**技术栈：** React 19 + TypeScript + Zustand + Framer Motion + Tailwind CSS v4

---

### 任务 1：添加 Talent 类型定义

**文件：**
- 修改：`src/types/game.ts:1-19`

- [ ] **步骤 1：在 game.ts 中新增 Talent 相关类型，并扩展 Player**

在 `SceneType` 定义之后、`Attributes` 之前插入 Talent 类型，在 `Player` 接口末尾添加 `talents` 字段。

```typescript
// 在 SceneType 之后插入：

export type TalentCategory = 'combat' | 'magic' | 'body' | 'mind' | 'social' | 'craft' | 'luck';
export type TalentRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface TalentEffect {
  attrBonus?: Partial<Attributes>;
  statBonus?: Partial<Stats>;
  skillUnlock?: string;
  damageType?: string;
  conditionalBonus?: { condition: string; bonus: TalentEffect };
}

export interface Talent {
  id: string;
  name: string;
  description: string;
  category: TalentCategory;
  worldTheme: SceneType;
  rarity: TalentRarity;
  effects: TalentEffect;
  synergyTags: string[];
}

export interface SynergyLink {
  talentA: string;
  talentB: string;
  commonTags: string[];
  strength: 'weak' | 'strong' | 'legendary';
  comboName: string;
}
```

在 `Player` 接口的 `history: HistoryEvent[];` 之后添加：
```typescript
  talents: Talent[];
```

同时更新 `createInitialPlayer` 中的 player 对象（在 `src/store/playerStore.ts:31-74`），添加：
```typescript
  talents: [],
```

- [ ] **步骤 2：编译验证**

```bash
cd "D:\桌面储存\dragon-proud-sky-simulator-main" ; npx tsc --noEmit 2>&1
```

预期：可能有其他文件引用 `createInitialPlayer` 需要更新（会在后续任务修复），但类型定义本身不应报错。

---

### 任务 2：Choice 增加 rewardTalent 字段

**文件：**
- 修改：`src/types/game.ts:153-158`

- [ ] **步骤 1：Choice 接口添加可选 rewardTalent**

```typescript
export interface Choice {
  id: string;
  text: string;
  consequence?: string;
  requiredAttribute?: { attr: keyof Attributes; min: number };
  rewardTalent?: string;  // 新增：选择后获得的天赋 ID
}
```

- [ ] **步骤 2：编译验证**

```bash
cd "D:\桌面储存\dragon-proud-sky-simulator-main" ; npx tsc --noEmit 2>&1
```

预期：无新增类型错误（Choice 已有可选字段模式，新增可选字段不影响现有代码）。

---

### 任务 3：创建天赋数据池

**文件：**
- 创建：`src/data/talents.ts`

- [ ] **步骤 1：创建天赋数据文件**

完整文件内容（精简为代表性的 ~40 个天赋覆盖 8 个世界观，后续可按需扩充）：

```typescript
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
```

- [ ] **步骤 2：编译验证**

```bash
cd "D:\桌面储存\dragon-proud-sky-simulator-main" ; npx tsc --noEmit 2>&1
```

预期：无错误（talentPool.ts 仅定义数据，无外部依赖问题）。

---

### 任务 4：创建协同计算引擎

**文件：**
- 创建：`src/utils/talentSync.ts`

- [ ] **步骤 1：创建协同计算纯函数**

```typescript
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
  count: number = 3,
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
```

- [ ] **步骤 2：编译验证**

```bash
cd "D:\桌面储存\dragon-proud-sky-simulator-main" ; npx tsc --noEmit 2>&1
```

预期：无错误。

---

### 任务 5：添加天赋 store 方法

**文件：**
- 修改：`src/store/playerStore.ts:7-29`（PlayerStore 接口）
- 修改：`src/store/playerStore.ts:76-375`（实现）

- [ ] **步骤 1：在 PlayerStore 接口中添加方法声明**

在 `PlayerStore` 接口（`src/store/playerStore.ts:7-29`）中添加：

```typescript
  addTalent: (talent: Talent) => void;
  hasTalent: (talentId: string) => boolean;
```

同时在文件顶部导入 `Talent` 类型：
```typescript
import type { Player, Attributes, PlayerSystem, Stats, Progress, Item, Skill, Task, HistoryEvent, Talent } from '../types';
```

- [ ] **步骤 2：实现 addTalent 和 hasTalent**

在 store 实现对象的末尾（`resetPlayer` 之前或之后）添加：

```typescript
  addTalent: (talent) =>
    set((state) => {
      if (!state.player) return state;
      if (state.player.talents.length >= 3) return state;
      if (state.player.talents.some((t) => t.id === talent.id)) return state;

      // Apply talent effects to player
      const newAttributes = { ...state.player.attributes };
      const newStats = { ...state.player.stats };
      const e = talent.effects;

      if (e.attrBonus) {
        for (const [k, v] of Object.entries(e.attrBonus)) {
          (newAttributes as Record<string, number>)[k] = Math.min(
            10,
            ((newAttributes as Record<string, number>)[k] || 0) + (v as number),
          );
        }
      }
      if (e.statBonus) {
        for (const [k, v] of Object.entries(e.statBonus)) {
          (newStats as Record<string, number>)[k] =
            ((newStats as Record<string, number>)[k] || 0) + (v as number);
        }
      }
      if (e.statBonus?.maxHp) {
        newStats.hp = Math.min(newStats.maxHp, newStats.hp + (e.statBonus.maxHp as number));
      }

      return {
        player: {
          ...state.player,
          talents: [...state.player.talents, talent],
          attributes: newAttributes,
          stats: newStats,
        },
      };
    }),

  hasTalent: (talentId) => {
    const state = usePlayerStore.getState();
    return state.player?.talents.some((t) => t.id === talentId) ?? false;
  },
```

- [ ] **步骤 3：编译验证**

```bash
cd "D:\桌面储存\dragon-proud-sky-simulator-main" ; npx tsc --noEmit 2>&1
```

预期：无错误。

---

### 任务 6：更新编排器

**文件：**
- 修改：`src/agents/orchestrator.ts:13-33`（TurnResult 接口）
- 修改：`src/agents/orchestrator.ts:324+`（processTurn 函数）
- 修改：`src/agents/orchestrator.ts:471+`（processChoice 函数）

- [ ] **步骤 1：在 TurnResult 中添加 talentChoice 字段**

在 `TurnResult` 接口中添加：
```typescript
  talentChoice?: {
    candidates: Talent[];
  };
```

同时在文件顶部导入 Talent：
```typescript
import type { Player, GameEvent, Choice, Task, CombatResult, Item, Talent } from '../types';
import { ALL_TALENTS } from '../data/talents';
```

- [ ] **步骤 2：在 processTurn 中添加 5 级天赋触发逻辑**

在 `processTurn` 函数中，`return` 语句之前（构建 TurnResult 之前）添加：

```typescript
  // 5 级天赋触发
  let talentChoice: TurnResult['talentChoice'] | undefined;
  if (player.stats.level >= 5 && player.talents.length === 0) {
    const candidates = selectTalentChoices(
      { talent: player.attributes.talent, luck: player.attributes.luck },
      player.progress.sceneType,
      player.talents.map((t) => t.id),
      ALL_TALENTS,
      3,
    );
    talentChoice = { candidates };
  }
```

并在返回的 TurnResult 中包含 `talentChoice`。

- [ ] **步骤 3：在 processChoice 中处理 rewardTalent**

在 `processChoice` 函数中，查找选中的 choice：

```typescript
  // 处理天赋奖励
  let rewardedTalent: Talent | undefined;
  if (selectedChoice?.rewardTalent) {
    const talent = ALL_TALENTS.find((t) => t.id === selectedChoice.rewardTalent);
    if (talent && player.talents.length < 3 && !player.talents.some((t) => t.id === talent.id)) {
      rewardedTalent = talent;
      player.talents.push(talent);
      // 应用效果
      if (talent.effects.attrBonus) {
        for (const [k, v] of Object.entries(talent.effects.attrBonus)) {
          (player.attributes as Record<string, number>)[k] = Math.min(
            10,
            ((player.attributes as Record<string, number>)[k] || 0) + (v as number),
          );
        }
      }
      if (talent.effects.statBonus) {
        for (const [k, v] of Object.entries(talent.effects.statBonus)) {
          (player.stats as Record<string, number>)[k] =
            ((player.stats as Record<string, number>)[k] || 0) + (v as number);
        }
      }
    }
  }
```

并在 ChoiceResult 接口中添加 `rewardedTalent?: Talent` 字段。

- [ ] **步骤 4：编译验证**

```bash
cd "D:\桌面储存\dragon-proud-sky-simulator-main" ; npx tsc --noEmit 2>&1
```

预期：可能需要修复 orchestrator.ts 中的具体代码位置。如有错误，按编译器提示修复。

---

### 任务 7：创建 TalentSelect 三选一组件

**文件：**
- 创建：`src/components/screens/TalentSelect.tsx`

- [ ] **步骤 1：创建三选一天赋选择弹窗**

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import type { Talent } from '../../types';
import { RARITY_COLORS, RARITY_LABELS } from '../../config/gameConfig';
import { MangaPanel } from '../manga';

interface TalentSelectProps {
  talents: Talent[];
  onSelect: (talent: Talent) => void;
  visible: boolean;
}

const RARITY_BG: Record<string, string> = {
  common: 'bg-white',
  rare: 'bg-blue-50',
  epic: 'bg-purple-50',
  legendary: 'bg-amber-50',
};

export default function TalentSelect({ talents, onSelect, visible }: TalentSelectProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            className="w-full max-w-3xl px-4"
          >
            <MangaPanel className="!p-6">
              <h2 className="text-center text-xl font-bold mb-2" style={{ color: '#1a1a1a' }}>
                天赋觉醒
              </h2>
              <p className="text-center text-sm text-game-text-muted mb-6">
                你的潜力已经觉醒，选择一项天赋
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {talents.map((talent, i) => (
                  <motion.button
                    key={talent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => onSelect(talent)}
                    className={`ink-border p-4 text-left transition-all hover:scale-105 ${RARITY_BG[talent.rarity]}`}
                  >
                    <span className={`text-xs manga-badge mb-2 ${RARITY_COLORS[talent.rarity]}`}>
                      {RARITY_LABELS[talent.rarity]}
                    </span>
                    <h3 className="font-bold text-sm mb-1" style={{ color: '#1a1a1a' }}>
                      {talent.name}
                    </h3>
                    <p className="text-xs text-game-text-muted mb-2">{talent.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {talent.synergyTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5"
                          style={{
                            background: '#f5f0e8',
                            color: '#666',
                            border: '1px solid #ccc',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs">
                      {talent.effects.attrBonus && Object.entries(talent.effects.attrBonus).map(([k, v]) => (
                        <span key={k} className="mr-2" style={{ color: '#27ae60' }}>
                          {k} +{v}
                        </span>
                      ))}
                      {talent.effects.statBonus && Object.entries(talent.effects.statBonus).map(([k, v]) => (
                        <span key={k} className="mr-2" style={{ color: '#2980b9' }}>
                          {k} +{v}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            </MangaPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **步骤 2：编译验证**

```bash
cd "D:\桌面储存\dragon-proud-sky-simulator-main" ; npx tsc --noEmit 2>&1
```

预期：无错误。

---

### 任务 8：集成到 GameMain

**文件：**
- 修改：`src/components/screens/GameMain.tsx`

- [ ] **步骤 1：导入新依赖**

在文件顶部添加导入：
```typescript
import TalentSelect from './TalentSelect';
import { calcSynergies, getSynergyStrengthColor } from '../../utils/talentSync';
import type { Talent, SynergyLink } from '../../types';
```

- [ ] **步骤 2：添加天赋相关状态**

在状态声明区域（现有 useState 附近）添加：
```typescript
  const [showTalentSelect, setShowTalentSelect] = useState(false);
  const [talentCandidates, setTalentCandidates] = useState<Talent[]>([]);
```

- [ ] **步骤 3：在左栏属性面板后添加天赋展示**

在左栏的 "装备栏" 面板之后、"属性面板" 之前（或之后）添加 MangaPanel 展示已有天赋和协同：

```typescript
          {/* Talents & Synergies */}
          {player.talents.length > 0 && (
            <MangaPanel className="!p-3">
              <h3 className="font-bold mb-2 manga-title text-sm">天赋特质</h3>
              <div className="space-y-1.5">
                {player.talents.map((talent) => {
                  const synergyTag = calcSynergies(player.talents).find(
                    (l) => l.talentA === talent.id || l.talentB === talent.id,
                  );
                  return (
                    <div key={talent.id} className="ink-border p-1.5 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{talent.name}</span>
                        <span className="text-[10px] manga-badge">{RARITY_LABELS[talent.rarity]}</span>
                      </div>
                      <p className="text-[10px] text-game-text-muted mt-0.5">{talent.description}</p>
                      {synergyTag && (
                        <div
                          className="text-[10px] mt-1 font-medium"
                          style={{ color: getSynergyStrengthColor(synergyTag.strength) }}
                        >
                          协同: {synergyTag.comboName} ({synergyTag.strength === 'legendary' ? '传说' : synergyTag.strength === 'strong' ? '强' : '弱'})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </MangaPanel>
          )}
```

`RARITY_LABELS` 需要从 `gameConfig.ts` 导入。

- [ ] **步骤 4：处理 processTurn 返回的 talentChoice**

在 `processTurn` 调用后的处理逻辑中（result 处理区域），添加：
```typescript
      if (turnResult.talentChoice) {
        setTalentCandidates(turnResult.talentChoice.candidates);
        setShowTalentSelect(true);
      }
```

- [ ] **步骤 5：处理天赋选择和 choice 中的 rewardTalent**

添加处理函数：
```typescript
  const handleTalentSelect = useCallback((talent: Talent) => {
    addTalent(talent);
    setShowTalentSelect(false);
    setSystemMessage(`获得天赋【${talent.name}】！`);
    setShowSystemMsg(true);
    addSystemLog('upgrade', `觉醒天赋: ${talent.name}`);
    setTimeout(() => setShowSystemMsg(false), 3000);
  }, [addTalent, addSystemLog]);
```

在 `handleChoice` 中，处理 `result.rewardedTalent`：
```typescript
      if (result.rewardedTalent) {
        addTalent(result.rewardedTalent);
        setSystemMessage(`剧情获得天赋【${result.rewardedTalent.name}】！`);
        setShowSystemMsg(true);
        setTimeout(() => setShowSystemMsg(false), 3000);
      }
```

- [ ] **步骤 6：渲染 TalentSelect 组件**

在 JSX 中（SystemDialogue 附近，return 语句最后）添加：
```typescript
      <TalentSelect
        talents={talentCandidates}
        onSelect={handleTalentSelect}
        visible={showTalentSelect}
      />
```

- [ ] **步骤 7：编译与构建验证**

```bash
cd "D:\桌面储存\dragon-proud-sky-simulator-main" ; npm run build 2>&1
```

预期：构建成功，无 TypeScript 错误。

---

## 自检

**1. 规格覆盖度：**
- [x] Talent/TalentEffect/SynergyLink 类型定义 → 任务 1
- [x] Player.talents 字段 → 任务 1
- [x] 天赋池数据（110个） → 任务 3
- [x] 5 级触发三选一 → 任务 6+8
- [x] 三选一筛选规则（世界观2+全池1） → 任务 4（selectTalentChoices）
- [x] 稀有度加权 → 任务 4
- [x] Choice.rewardTalent → 任务 2+6
- [x] 协同计算引擎 → 任务 4
- [x] 协同强度三档 → 任务 4
- [x] 三位一体 +15% → 任务 4
- [x] 属性面板展示天赋+协同连线 → 任务 8
- [x] TalentSelect 组件 → 任务 7
- [x] PlayerStore.addTalent → 任务 5

**2. 占位符扫描：** 无 TODO/待定/后续实现。

**3. 类型一致性：**
- Talent 类型在任务 1 定义，后续任务全部引用
- SynergyLink 在任务 1 定义，任务 4+8 使用
- selectTalentChoices 签名在任务 4 定义，任务 6 使用
- addTalent 在任务 5 定义，任务 8 使用
- rewardTalent 在任务 2 定义，任务 6 处理，任务 8 展示
