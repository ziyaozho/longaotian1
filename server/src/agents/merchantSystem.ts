import type { Player, GameEvent, Choice, Item } from '../types';
import type { MerchantItem, Artifact } from '../data/artifacts';
import { MERCHANT_ITEMS, LEGENDARY_ARTIFACTS } from '../data/artifacts';
import { checkProbability, randomInt, randomChoice } from '../utils/random';

// ============================================================
// 商人邂逅系统 —— 商人.txt §1.3
// ============================================================

/** 商人触发概率 */
const MERCHANT_BASE_CHANCE = 0.15;
/** 最低触发间隔回合数 */
const MERCHANT_MIN_INTERVAL = 5;

let lastMerchantRound = 0;

/**
 * 判定是否触发商人事件
 */
export function shouldTriggerMerchant(round: number): boolean {
  if (round - lastMerchantRound < MERCHANT_MIN_INTERVAL) return false;
  return checkProbability(MERCHANT_BASE_CHANCE);
}

/**
 * 生成商人邂逅事件
 */
export function generateMerchantEvent(player: Player): GameEvent | null {
  lastMerchantRound = player.progress.round;

  // 根据玩家等级和运气决定商品数量
  const levelBonus = Math.floor(player.stats.level / 5);
  const luckBonus = player.attributes.luck;
  const itemCount = Math.min(5, 2 + levelBonus + (luckBonus > 5 ? 1 : 0));

  // 从商品池中随机选择
  const affordable = MERCHANT_ITEMS.filter((item) => {
    // 稀有商品概率递减
    if (item.rarity === 'legendary') return checkProbability(0.1);
    if (item.rarity === 'epic') return checkProbability(0.3);
    return true;
  });

  const shuffled = [...affordable].sort(() => Math.random() - 0.5);
  const selectedItems = shuffled.slice(0, itemCount);

  // 构建商品列表描述
  const itemList = selectedItems
    .map((item) => `【${item.name}】${item.rarity === 'legendary' ? '⭐传说' : item.rarity === 'epic' ? '★史诗' : item.rarity === 'rare' ? '◆稀有' : '·普通'} — ${item.description} — 价格：${item.price}金币`)
    .join('\n');

  // 商人性格随机
  const personalities = [
    { title: '行脚商人', style: '神秘兮兮地压低声音' },
    { title: '黑市贩子', style: '叼着烟卷，眯着眼打量你' },
    { title: '流浪法师', style: '手杖轻敲地面，周围的空间微微扭曲' },
    { title: '古董店主', style: '推了推老花镜，从柜台下拖出一个布满灰尘的箱子' },
    { title: '异界商人', style: '周围环绕着淡蓝色光晕，声音仿佛从遥远的地方传来' },
  ];
  const persona = personalities[Math.floor(Math.random() * personalities.length)];

  const description = `${persona.title}${persona.style}："嘿，朋友！我看你骨骼清奇，身上还带着系统的气息...要不要看看我的好货？"\n\n【商品列表】\n${itemList}\n\n你的金钱：¥${player.stats.wealth}`;

  // 构建选项
  const choices: Choice[] = selectedItems
    .filter((item) => item.price <= player.stats.wealth + 100) // 买得起的 + 稍微不够的
    .slice(0, 3)
    .map((item, index) => ({
      id: `buy_${item.id}`,
      text: `购买【${item.name}】（${item.price}💰）`,
      consequence: item.price <= player.stats.wealth
        ? item.effect
          ? `支付¥${item.price}，${Object.entries(item.effect).map(([k, v]) => `${k}+${v}`).join('，')}`
          : `支付¥${item.price}`
        : '金钱不足！',
      rewardTalent: undefined, // Coin check in processChoice
    }));

  // 讨价还价（魅力检定）
  choices.push({
    id: 'bargain',
    text: '讨价还价（魅力检定）',
    consequence: player.attributes.appearance >= 6
      ? '魅力高，可能获得折扣'
      : '魅力不足，可能被拒绝',
  });

  // 离开
  choices.push({
    id: 'merchant_leave',
    text: '转身离开',
    consequence: '安全离开，无损失',
  });

  return {
    id: `merchant_${Date.now()}`,
    title: `偶遇${persona.title}`,
    description,
    choices,
    type: 'random',
  };
}

// ============================================================
// 龙傲天级道具发放 —— 商人.txt §2
// ============================================================

/**
 * 签到7天触发隐藏奖励：随机传说道具
 */
export function checkLegendaryDrop(
  checkInStreak: number,
  player: Player
): Artifact | null {
  if (checkInStreak > 0 && checkInStreak % 7 === 0) {
    const ownedIds = player.inventory.map((i) => i.id);
    const available = LEGENDARY_ARTIFACTS.filter((a) => !ownedIds.includes(a.id));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }
  return null;
}

/**
 * 获取可交易的传说道具列表（用于商人事件）
 */
export function getTradableArtifacts(player: Player): Artifact[] {
  return LEGENDARY_ARTIFACTS.filter(
    (a) => !player.inventory.some((i) => i.id === a.id)
  );
}

/**
 * 获取玩家持有的可交易物品描述
 */
export function getTradableItemsSummary(player: Player): string {
  const items = player.inventory;
  if (items.length === 0) return '无';

  return items
    .filter((i) => i.rarity === 'legendary' || i.rarity === 'epic')
    .map((i) => `${i.name}（${i.rarity === 'legendary' ? '传说' : '史诗'}）`)
    .join('，');
}

// ============================================================
// AI Prompt 注入 —— 商人.txt §1.3, §3.2
// ============================================================

/**
 * 构建经济状态文本（注入到剧情编织者 prompt）
 */
export function buildEconomicContext(player: Player): string {
  const tradableItems = getTradableItemsSummary(player);
  const artifactsOwned = player.inventory.filter(
    (i) => LEGENDARY_ARTIFACTS.some((a) => a.id === i.id)
  );

  let context = `【经济状态】\n当前金钱：¥${player.stats.wealth}\n持有可交易物品：${tradableItems}`;

  if (artifactsOwned.length > 0) {
    context += '\n\n【道具互动铁律】\n';
    context += '若玩家持有未在近期事件中使用过的逆天道具，你必须在接下来3回合内安排一个自然场景，让该道具发挥关键作用。\n';
    context += '使用道具时需明确描写其效果，让玩家切实感到它的强大。道具使用后记录冷却。\n';
    context += `当前持有逆天道具：${artifactsOwned.map((i) => i.name).join('、')}`;
  }

  // 商人出现概率提示
  const merchantChance = player.progress.round - lastMerchantRound >= 5 ? 15 : 0;
  if (merchantChance > 0) {
    context += `\n\n【随机事件可能性】本回合有${merchantChance}%概率触发"行脚商人"事件。若触发，请在叙事中插入一位神秘商人，其出售物品需与玩家当前境况相关，价格合理，并提供购买选项。`;
  }

  return context;
}

/**
 * 构建道具使用高光提示
 */
export function buildArtifactUsageHints(player: Player): string {
  const unusedArtifacts = player.inventory.filter(
    (i) => LEGENDARY_ARTIFACTS.some((a) => a.id === i.id)
  );

  if (unusedArtifacts.length === 0) return '';

  return (
    '【道具高光时刻提醒】\n' +
    unusedArtifacts
      .map((a) => {
        const artifact = LEGENDARY_ARTIFACTS.find((aa) => aa.id === a.id);
        return artifact
          ? `- ${artifact.name}：${artifact.evolveEffects[artifact.evolveStage]}，可用于解决当前困境`
          : '';
      })
      .filter(Boolean)
      .join('\n') +
    '\n请在合适时机让道具发挥关键作用。'
  );
}
