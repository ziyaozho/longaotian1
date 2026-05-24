import type { Item } from '../types';
import { randomInt, checkProbability, randomChoice } from '../utils/random';

let itemIdCounter = 0;

export function generateItemId(): string {
  itemIdCounter++;
  return `item_${Date.now()}_${crypto.randomUUID()}_${itemIdCounter}`;
}

export const ITEM_TEMPLATES: Array<Pick<Item, 'name' | 'description' | 'rarity' | 'type' | 'effect'>> = [
  // 消耗品 - 恢复类
  { name: '小还丹', description: '基础的恢复丹药，能恢复少量生命值', rarity: 'common', type: 'consumable', effect: { hp: 30 } },
  { name: '大还丹', description: '高级恢复丹药，能恢复大量生命值', rarity: 'rare', type: 'consumable', effect: { hp: 80 } },
  { name: '回灵散', description: '恢复灵力/能量的药剂', rarity: 'common', type: 'consumable', effect: { mp: 25 } },
  { name: '九转金丹', description: '传说中的神药，能恢复全部生命和灵力', rarity: 'legendary', type: 'consumable', effect: { hp: 999, mp: 999 } },
  { name: '止血草', description: '野外常见的草药，能稍微恢复伤势', rarity: 'common', type: 'consumable', effect: { hp: 15 } },
  { name: '能量饮料', description: '现代都市的恢复品，提神醒脑', rarity: 'common', type: 'consumable', effect: { mp: 20, hp: 10 } },

  // 消耗品 - 增益类
  { name: '狂暴药剂', description: '短时间内提升战斗力', rarity: 'rare', type: 'consumable', effect: { combatPower: 20 } },
  { name: '幸运符', description: '提升运气，持续一段时间', rarity: 'rare', type: 'consumable', effect: { luck: 3 } },
  { name: '悟性丹', description: '服用后悟性大增，获得额外经验', rarity: 'epic', type: 'consumable', effect: { exp: 100 } },

  // 武器
  { name: '铁剑', description: '普通的铁制长剑，锋利度一般', rarity: 'common', type: 'weapon', effect: { combatPower: 10 } },
  { name: '精钢刃', description: '由精钢打造的武器，品质上乘', rarity: 'rare', type: 'weapon', effect: { combatPower: 25 } },
  { name: '灵能枪', description: '科技与灵能结合的武器', rarity: 'rare', type: 'weapon', effect: { combatPower: 20, intelligence: 1 } },
  { name: '法宝·青锋', description: '蕴含灵气的飞剑，可御剑飞行', rarity: 'epic', type: 'weapon', effect: { combatPower: 40, mp: 20 } },
  { name: '混沌至宝', description: '开天辟地时诞生的神器', rarity: 'legendary', type: 'weapon', effect: { combatPower: 100, talent: 5 } },

  // 防具
  { name: '皮甲', description: '基础防具，能提供少量防护', rarity: 'common', type: 'armor', effect: { maxHp: 20 } },
  { name: '精钢甲', description: '坚固的金属铠甲', rarity: 'rare', type: 'armor', effect: { maxHp: 50, combatPower: 5 } },
  { name: '灵衣', description: '由灵气编织的法衣，轻便而坚韧', rarity: 'epic', type: 'armor', effect: { maxHp: 80, mp: 30 } },
  { name: '不灭金身', description: '至高无上的防御至宝', rarity: 'legendary', type: 'armor', effect: { maxHp: 200, physique: 3 } },

  // 技能书
  { name: '基础拳法', description: '入门级的战斗技巧', rarity: 'common', type: 'skill_book', effect: { combatPower: 8 } },
  { name: '凝神诀', description: '提升精神力的修炼法门', rarity: 'rare', type: 'skill_book', effect: { mp: 30, intelligence: 2 } },
  { name: '遁术秘籍', description: '保命用的逃遁之术', rarity: 'rare', type: 'skill_book', effect: { luck: 2 } },
  { name: '天罡三十六变', description: '传说中的变化之术', rarity: 'legendary', type: 'skill_book', effect: { talent: 5, combatPower: 30 } },

  // 材料
  { name: '灵石', description: '蕴含灵气的石头，修炼者的货币', rarity: 'common', type: 'material', effect: { wealth: 50 } },
  { name: '妖兽内丹', description: '妖兽体内凝结的精华', rarity: 'rare', type: 'material', effect: { exp: 60 } },
  { name: '天外陨铁', description: '从天而降的稀有金属', rarity: 'epic', type: 'material', effect: { wealth: 300 } },
];

export const SCENE_ITEMS: Record<string, string[]> = {
  modern_city: ['能量饮料', '灵能枪', '精钢刃', '幸运符'],
  cultivation: ['小还丹', '大还丹', '回灵散', '铁剑', '皮甲', '基础拳法', '灵石', '妖兽内丹'],
  urban_fantasy: ['能量饮料', '小还丹', '精钢刃', '灵衣', '遁术秘籍'],
  apocalypse: ['止血草', '能量饮料', '皮甲', '铁剑', '狂暴药剂'],
  apoc_fantasy: ['小还丹', '止血草', '精钢甲', '回灵散', '妖兽内丹'],
  hidden_immortal: ['大还丹', '九转金丹', '法宝·青锋', '灵衣', '天罡三十六变', '混沌至宝', '天外陨铁'],
  hidden_cyber: ['灵能枪', '能量饮料', '幸运符', '精钢刃'],
  hidden_demon: ['狂暴药剂', '妖兽内丹', '不灭金身', '混沌至宝'],
};

export function generateRandomItem(sceneType: string, playerLevel: number): Item | null {
  // 根据场景和玩家等级决定掉落
  const sceneItemNames = SCENE_ITEMS[sceneType] || SCENE_ITEMS['modern_city'];

  // 基础掉落概率 30%，玩家运气影响
  const dropChance = 0.3;
  if (!checkProbability(dropChance)) return null;

  // 从场景可用物品中筛选符合当前等级的
  const availableItems = ITEM_TEMPLATES.filter(item => sceneItemNames.includes(item.name));
  if (availableItems.length === 0) return null;

  // 根据玩家等级提升稀有度概率
  const rarityRoll = Math.random();
  let minRarity: number;
  if (rarityRoll < 0.5 - playerLevel * 0.005) minRarity = 0; // common
  else if (rarityRoll < 0.8 - playerLevel * 0.003) minRarity = 1; // rare
  else if (rarityRoll < 0.95) minRarity = 2; // epic
  else minRarity = 3; // legendary

  const rarityOrder = ['common', 'rare', 'epic', 'legendary'];
  const targetRarity = rarityOrder[Math.min(minRarity, 3)];

  // 优先选择目标稀有度，如果没有则降级
  let candidates = availableItems.filter(item => item.rarity === targetRarity);
  if (candidates.length === 0) {
    candidates = availableItems;
  }

  const template = randomChoice(candidates);

  return {
    id: generateItemId(),
    ...template,
  };
}

export function generateCombatLoot(sceneType: string, enemyLevel: number, isVictory: boolean): Item | null {
  if (!isVictory) return null;

  // 胜利后额外掉落
  const lootChance = 0.35 + enemyLevel * 0.02;
  if (!checkProbability(lootChance)) return null;

  const sceneItemNames = SCENE_ITEMS[sceneType] || SCENE_ITEMS['modern_city'];
  const availableItems = ITEM_TEMPLATES.filter(item => sceneItemNames.includes(item.name));
  if (availableItems.length === 0) return null;

  // 战斗掉落偏向武器、防具、材料
  const combatItems = availableItems.filter(item =>
    item.type === 'weapon' || item.type === 'armor' || item.type === 'material' || item.type === 'skill_book'
  );

  const candidates = combatItems.length > 0 ? combatItems : availableItems;

  // 高等级敌人更容易掉好装备
  const rarityBoost = Math.min(enemyLevel * 0.02, 0.3);
  const rarityRoll = Math.random();
  let minRarity: number;
  if (rarityRoll < 0.5 - rarityBoost) minRarity = 0;
  else if (rarityRoll < 0.8 - rarityBoost * 0.5) minRarity = 1;
  else if (rarityRoll < 0.95) minRarity = 2;
  else minRarity = 3;

  const rarityOrder = ['common', 'rare', 'epic', 'legendary'];
  const targetRarity = rarityOrder[Math.min(minRarity, 3)];

  let finalCandidates = candidates.filter(item => item.rarity === targetRarity);
  if (finalCandidates.length === 0) {
    finalCandidates = candidates;
  }

  const template = randomChoice(finalCandidates);

  return {
    id: generateItemId(),
    ...template,
  };
}

// 使用道具的效果计算
export function useItemEffect(item: Item): Record<string, number> {
  const effects: Record<string, number> = {};

  if (item.effect) {
    for (const [key, value] of Object.entries(item.effect)) {
      effects[key] = value;
    }
  }

  return effects;
}

/** 根据关键词模糊匹配物品模板（用于从AI叙事中提取物品） */
export function findItemByKeyword(keyword: string): typeof ITEM_TEMPLATES[0] | null {
  // 先尝试精确匹配
  const exact = ITEM_TEMPLATES.find(item => item.name === keyword);
  if (exact) return exact;

  // 再尝试部分匹配（物品名包含关键词，或关键词包含物品名）
  const candidates = ITEM_TEMPLATES.filter(item =>
    item.name.includes(keyword) || keyword.includes(item.name)
  );

  // 如果多个匹配，按稀有度降序返回最好的
  const rarityRank = { legendary: 3, epic: 2, rare: 1, common: 0 };
  candidates.sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));
  return candidates[0] || null;
}

/** 从文本中解析 【物品名】 标记，返回匹配的物品模板列表 */
export function extractItemsFromText(text: string): Array<{ name: string; template: typeof ITEM_TEMPLATES[0] }> {
  const matches = text.matchAll(/【([^】]+)】/g);
  const results: Array<{ name: string; template: typeof ITEM_TEMPLATES[0] }> = [];
  for (const match of matches) {
    const name = match[1].trim();
    if (!name) continue;
    let template = findItemByKeyword(name);
    if (!template) {
      template = synthesizeItem(name);
    }
    if (template) {
      results.push({ name, template });
    }
  }
  return results;
}

/**
 * 根据物品名推断类型和效果，生成一个兜底模板
 * 当 AI 生成的道具名不在 ITEM_TEMPLATES 中时使用
 */
function synthesizeItem(name: string): typeof ITEM_TEMPLATES[0] | null {
  if (!name || name.length < 2) return null;

  // 拒绝明显不是物品的词
  const nonItemWords = /普通人|路人|系统商城|商店|任务|事件|系统|提示|公告|消息|对话|选项|菜单|界面|按钮|场景|地图|关卡|副本|BOSS|NPC/;
  if (nonItemWords.test(name)) return null;

  // 按名称后缀推断类型
  if (/剑|刀|枪|刃|匕|戟|棍|棒|斧|锤|弓|弩|鞭|锏|矛|叉|镰|钩|杖|杵|镐|钺/.test(name)) {
    return {
      name,
      description: `${name}，一柄不错的武器`,
      rarity: 'rare',
      type: 'weapon',
      effect: { combatPower: 20 },
    };
  }
  if (/甲|衣|袍|篷|氅|衫|裳|铠|盾|盔|冠|胄|靴|履|带|戒|佩|腕/.test(name)) {
    return {
      name,
      description: `${name}，一件防具`,
      rarity: 'rare',
      type: 'armor',
      effect: { maxHp: 40 },
    };
  }
  if (/丹|药|散|丸|膏|汤|液|露|剂|水|茶|酒/.test(name)) {
    return {
      name,
      description: `${name}，可用于恢复`,
      rarity: 'common',
      type: 'consumable',
      effect: { hp: 40 },
    };
  }
  if (/石|玉|珠|核|晶|矿|铁|铜|金|银|钢/.test(name)) {
    return {
      name,
      description: `${name}，一种稀有材料`,
      rarity: 'rare',
      type: 'material',
      effect: { wealth: 80 },
    };
  }
  if (/诀|经|典|谱|卷|策|书|图|录|篇|章/.test(name)) {
    return {
      name,
      description: `${name}，记录了某种技艺`,
      rarity: 'rare',
      type: 'skill_book',
      effect: { combatPower: 15, intelligence: 1 },
    };
  }

  // 无法识别类型 —— 兜底为普通物品，保证剧情说获得的每件物品都能生成
  return {
    name,
    description: `${name}，一件看起来不太寻常的物品`,
    rarity: 'common',
    type: 'consumable',
    effect: { hp: 10 },
  };
}

/** 检测文本是否暗示获得物品（无【】标记时的后备检测） */
export function impliesItemAcquisition(text: string): boolean {
  const obtainVerbs = /获得|得到|拿到|捡到|捡起|收取|收下|拿走|夺取|缴获|发现|找到|搜出|开出|掉落|奖励|赠予|拾取|领取|领取|赚取/;
  const itemNouns = /剑|刀|枪|甲|衣|丹|药|符|石|书|卷|珠|环|戒|鼎|塔|镜|图|印|宝|袋|盒|箱|瓶|壶|炉|幡|令|牌|令|钟|铃|伞|灯/;

  // 排除明显不是物品的上下文
  const nonItemContext = /系统商城|任务提示|关卡|副本|NPC|菜单|界面|商店|功能/;
  if (nonItemContext.test(text)) return false;

  return obtainVerbs.test(text) && itemNouns.test(text);
}

/** 根据文本生成一个相关物品（用于AI剧情物品奖励） */
export function generateContextualItem(sceneType: string, playerLevel: number, contextText: string): Item | null {
  // 先尝试从【】标记匹配
  const extracted = extractItemsFromText(contextText);
  if (extracted.length > 0) {
    const chosen = extracted[Math.floor(Math.random() * extracted.length)];
    return {
      id: generateItemId(),
      ...chosen.template,
    };
  }

  // 没有标记则用常规随机掉落（但提高概率）
  const sceneItemNames = SCENE_ITEMS[sceneType] || SCENE_ITEMS['modern_city'];
  const available = ITEM_TEMPLATES.filter(item => sceneItemNames.includes(item.name));
  if (available.length === 0) return null;

  // 高概率掉落，偏向武器和消耗品（叙事中更容易涉及的类型）
  const narrativeItems = available.filter(item =>
    item.type === 'weapon' || item.type === 'consumable' || item.type === 'skill_book'
  );
  const candidates = narrativeItems.length > 0 ? narrativeItems : available;
  const template = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    id: generateItemId(),
    ...template,
  };
}

// 装备道具到玩家（武器/防具/技能书提供永久加成）
export function getEquipEffects(item: Item): Partial<Record<string, number>> {
  if (item.type === 'weapon' || item.type === 'armor' || item.type === 'skill_book') {
    return item.effect || {};
  }
  return {};
}
