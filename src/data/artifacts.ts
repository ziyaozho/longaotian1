import type { Item } from '../types';

// ============================================================
// 逆天道具库 —— 商人.txt §2
// ============================================================

/** 成长型奇物 */
export interface Artifact extends Item {
  evolveStage: number;          // 当前进化阶段 (0 = 初始)
  maxEvolveStage: number;       // 最大进化阶段
  evolveCondition: string;      // 进化条件描述
  evolveEffects: string[];      // 各阶段效果描述
  coolDown: number;             // 剩余冷却回合
  maxCoolDown: number;          // 最大冷却回合
  storyHook: string;            // 剧情锚点
}

/**
 * 传说级逆天道具库
 */
export const LEGENDARY_ARTIFACTS: Artifact[] = [
  {
    id: 'small_green_bottle',
    name: '小绿瓶',
    description: '一个看似普通的绿色小瓶，却能吸收月华凝结灵液，催熟天下灵植。每晚自动凝聚一滴"绿液"，可催熟灵药10年。',
    rarity: 'legendary',
    type: 'material',
    evolveStage: 0,
    maxEvolveStage: 3,
    evolveCondition: '累计使用10次后进化',
    evolveEffects: [
      '催熟灵药10年',
      '催熟灵药百年，凝聚灵液可治愈重伤',
      '催熟灵药千年，灵液可提升属性',
      '催熟灵药万年，开启灵植灵智，炼制造化丹',
    ],
    coolDown: 0,
    maxCoolDown: 3,
    storyHook: '主角靠其培育天材地宝，引发势力觊觎，最终成为炼丹宗师',
    effect: { hp: 10, mp: 5, exp: 20 },
  },
  {
    id: 'realm_breaker_pearl',
    name: '破界珠',
    description: '每天可进行1次短距离空间跳跃，冷却10回合。在逃亡、探秘时发挥奇效。',
    rarity: 'legendary',
    type: 'material',
    evolveStage: 0,
    maxEvolveStage: 3,
    evolveCondition: '使用空间跳跃累计5次后进化',
    evolveEffects: [
      '短距离空间跳跃（1次/10回合）',
      '中距离传送，可携带同伴',
      '跨界传送，无视世界壁垒',
      '打开稳定世界通道，自由跨世界旅行',
    ],
    coolDown: 0,
    maxCoolDown: 10,
    storyHook: '最后成为世界转换的钥匙，可自由穿梭诸天万界',
    effect: { combatPower: 30, luck: 1 },
  },
  {
    id: 'fortune_wheel',
    name: '命运轮盘',
    description: '每天可转动1次，随机获得一项临时属性提升或诅咒。赌博式选择带来巨大乐趣。',
    rarity: 'legendary',
    type: 'material',
    evolveStage: 0,
    maxEvolveStage: 3,
    evolveCondition: '累计使用20次后进化',
    evolveEffects: [
      '随机提升/削减一项属性（±2）',
      '可影响附近他人的运气',
      '小范围改写随机事件结果',
      '窥探命运长河，预知未来3回合关键走向',
    ],
    coolDown: 0,
    maxCoolDown: 5,
    storyHook: '关键时刻扭转战局，成为主角的底牌之一',
    effect: { luck: 2 },
  },
  {
    id: 'memory_tome',
    name: '记忆之书',
    description: '自动记录所有已发生事件，并可回放剧情细节。帮助玩家发现隐藏线索，防幻觉的同时成为战略利器。',
    rarity: 'legendary',
    type: 'material',
    evolveStage: 0,
    maxEvolveStage: 2,
    evolveCondition: '累计记录50回合后进化',
    evolveEffects: [
      '自动记录事件，可查阅历史',
      '预知未来3回合的可能走向（概率60%）',
      '精确预知未来5回合的完整剧情走向',
    ],
    coolDown: 0,
    maxCoolDown: 0,
    storyHook: '成为战略利器，让主角在关键时刻做出最优选择',
    effect: { intelligence: 3 },
  },
  {
    id: 'divine_forge_hammer',
    name: '神锻锤',
    description: '上古神匠遗留的锻造神器。可将普通材料锻造成传说级装备，有概率激发隐藏属性。',
    rarity: 'legendary',
    type: 'weapon',
    evolveStage: 0,
    maxEvolveStage: 3,
    evolveCondition: '累计锻造10件装备后进化',
    evolveEffects: [
      '锻造传说级装备，概率激发隐藏属性',
      '可修复损坏的传说装备',
      '锻造神器级装备，必定附带一项特殊能力',
      '可锻造天道级武器，一击灭世',
    ],
    coolDown: 0,
    maxCoolDown: 7,
    storyHook: '主角凭借神锻锤打造绝世神兵，引来各方势力求取',
    effect: { combatPower: 50 },
  },
];

/**
 * 商人可出售的普通商品
 */
export interface MerchantItem {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'equipment' | 'intel' | 'artifact';
  price: number;
  effect?: Record<string, number>;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const MERCHANT_ITEMS: MerchantItem[] = [
  // 消耗品
  { id: 'rejuvenation_pill', name: '回春丹', description: '恢复30点生命值', type: 'consumable', price: 50, effect: { hp: 30 }, rarity: 'common' },
  { id: 'spirit_pill', name: '回灵丹', description: '恢复20点灵力', type: 'consumable', price: 40, effect: { mp: 20 }, rarity: 'common' },
  { id: 'breakthrough_talisman', name: '破境符', description: '临时提升战力50点，持续3回合', type: 'consumable', price: 120, effect: { combatPower: 50 }, rarity: 'rare' },
  { id: 'body_refine_elixir', name: '炼体神液', description: '永久提升体质+1', type: 'consumable', price: 300, effect: { physique: 1 }, rarity: 'epic' },
  { id: 'enlightenment_tea', name: '悟道茶', description: '永久提升天赋+1', type: 'consumable', price: 500, effect: { talent: 1 }, rarity: 'epic' },
  { id: 'luck_charm', name: '幸运符', description: '永久提升运气+1', type: 'consumable', price: 250, effect: { luck: 1 }, rarity: 'rare' },

  // 装备
  { id: 'spirit_sword', name: '灵纹剑', description: '附有灵纹的长剑，战力+15', type: 'equipment', price: 100, effect: { combatPower: 15 }, rarity: 'common' },
  { id: 'shadow_cloak', name: '暗影斗篷', description: '降低被敌人发现的概率，运气+1，战力+10', type: 'equipment', price: 200, effect: { combatPower: 10, luck: 1 }, rarity: 'rare' },
  { id: 'flame_armor', name: '炎晶护甲', description: '以炎晶锻造的护甲，最大生命+30', type: 'equipment', price: 350, effect: { maxHp: 30 }, rarity: 'epic' },

  // 情报
  { id: 'treasure_map_1', name: '藏宝图碎片·壹', description: '记载着某处秘境的入口位置', type: 'intel', price: 150, rarity: 'rare' },
  { id: 'npc_weakness_scroll', name: '弱点情报', description: '记录当前世界随机一名重要NPC的秘密弱点', type: 'intel', price: 100, rarity: 'rare' },
  { id: 'world_secret_fragment', name: '世界秘闻·残页', description: '揭露当前世界的一个隐藏真相', type: 'intel', price: 200, rarity: 'epic' },

  // 奇物（小概率出现）
  { id: 'ancient_coin', name: '古神币', description: '注入了一丝神力的古老钱币，据说可以改变命运。运气+2', type: 'artifact', price: 800, effect: { luck: 2 }, rarity: 'legendary' },
  { id: 'phoenix_feather', name: '凤凰翎', description: '一根燃烧着淡金色火焰的羽毛。持有者死亡时可触发一次涅槃，满血复活。', type: 'artifact', price: 1000, effect: { maxHp: 50 }, rarity: 'legendary' },
];
