import type { Player, Attributes, NpcStatus } from '../types';
import type { MemoryState, StoryWeaverOutput, ValidationResult, EndingPrototype } from './types';

const MAX_ATTR_CHANGE = 5;

const REPETITION_THRESHOLD = 0.6;

const MAX_GOLD_PRICE = 1000;

export function validateNarrative(
  output: StoryWeaverOutput,
  player: Player,
  memory: MemoryState,
  endingPrototype?: EndingPrototype,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  checkDeadNpcs(output, player.npcStatuses, errors);
  checkEventRepetition(output, memory, errors, warnings);
  checkAttributeChanges(output, player.attributes, errors, warnings);
  checkMerchantConsistency(output, player, errors, warnings);
  if (endingPrototype) {
    checkEndingConditions(output, endingPrototype, player, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function checkDeadNpcs(
  output: StoryWeaverOutput,
  npcStatuses: Record<string, NpcStatus>,
  errors: string[],
): void {
  for (const npc of Object.values(npcStatuses)) {
    if (!npc.alive) {
      const pattern = new RegExp(npc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const inScene = pattern.test(output.sceneDescription);
      const inInteractions = output.npcInteractions.some(
        (ni) => ni.npcName === npc.name,
      );

      if (inScene || inInteractions) {
        errors.push(`出现已死亡NPC「${npc.name}」`);
      }
    }
  }
}

function checkEventRepetition(
  output: StoryWeaverOutput,
  memory: MemoryState,
  errors: string[],
  warnings: string[],
): void {
  const allRecent = memory.shortTerm.map((e) => e.event.toLowerCase());

  for (const newEvent of output.newEvents) {
    const normalized = newEvent.toLowerCase();

    for (const recent of allRecent) {
      const similarity = calcSimpleSimilarity(normalized, recent);
      if (similarity > REPETITION_THRESHOLD) {
        warnings.push(`新事件「${newEvent.slice(0, 30)}...」与近期事件高度相似`);
        break;
      }
    }

    for (const recent of allRecent) {
      if (normalized === recent) {
        errors.push(`新事件「${newEvent.slice(0, 30)}...」与已有事件完全重复`);
        break;
      }
    }
  }
}

function calcSimpleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/[\s，。！？、]/).filter((w) => w.length >= 2));
  const wordsB = new Set(b.split(/[\s，。！？、]/).filter((w) => w.length >= 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }

  return overlap / Math.max(wordsA.size, wordsB.size);
}

function checkAttributeChanges(
  output: StoryWeaverOutput,
  currentAttrs: Attributes,
  errors: string[],
  warnings: string[],
): void {
  for (const [key, value] of Object.entries(output.attributeChanges)) {
    if (value == null || value === 0) continue;

    const absChange = Math.abs(value);
    if (absChange > MAX_ATTR_CHANGE) {
      errors.push(`属性变化过大：${key} 变化 ${value}，超过阈值 ${MAX_ATTR_CHANGE}`);
    }

    const current = currentAttrs[key as keyof Attributes] || 0;
    if (current + value < 1) {
      warnings.push(`属性「${key}」可能降至异常低值`);
    }
    if (current + value > 10) {
      warnings.push(`属性「${key}」可能超过上限`);
    }
  }
}

function checkEndingConditions(
  output: StoryWeaverOutput,
  ending: EndingPrototype,
  player: Player,
  errors: string[],
): void {
  const combinedText =
    output.sceneDescription +
    ' ' +
    output.npcInteractions.map((ni) => ni.dialogue).join(' ') +
    ' ' +
    output.newEvents.join(' ');

  for (const cond of ending.conditions) {
    if (!cond.isStillPossible) continue;

    if (cond.type === 'social') {
      const npcMentions = Object.keys(player.npcStatuses).filter(
        (id) => player.npcStatuses[id].alive,
      );

      const deathKeywords = ['死亡', '牺牲', '陨落', '死去', '毙命', '阵亡'];
      for (const npcId of npcMentions) {
        const npc = player.npcStatuses[npcId];
        for (const kw of deathKeywords) {
          if (npc.affection >= 60 && combinedText.includes(npc.name) && combinedText.includes(kw)) {
            errors.push(`关键NPC「${npc.name}」可能死亡，会影响结局条件「${cond.description}」`);
          }
        }
      }
    }
  }
}

const MERCHANT_KEYWORDS = ['商人', '购买', '出售', '价格', '金币', '交易', '商贩', '黑市', '拍卖'];
const WORLD_MAX_PRICES: Record<string, number> = {
  modern_city: 500,
  cultivation: 800,
  urban_fantasy: 600,
  apocalypse: 300,
  apoc_fantasy: 400,
  hidden_immortal: 1000,
  hidden_cyber: 700,
  hidden_demon: 900,
};

function checkMerchantConsistency(
  output: StoryWeaverOutput,
  player: Player,
  errors: string[],
  warnings: string[],
): void {
  const combinedText = output.sceneDescription + ' ' + output.npcInteractions.map((ni) => ni.dialogue).join(' ');

  const hasMerchant = MERCHANT_KEYWORDS.some((kw) => combinedText.includes(kw));
  if (!hasMerchant) return;

  const priceMatch = combinedText.match(/(\d+)\s*(金|金币|金块)/g);
  if (priceMatch) {
    for (const p of priceMatch) {
      const amount = parseInt(p.match(/\d+/)?.[0] || '0');
      if (amount > MAX_GOLD_PRICE) {
        errors.push(`商人价格过高：${p}，超过上限${MAX_GOLD_PRICE}金`);
      }
      if (amount > player.stats.gold * 3 && player.stats.gold > 0) {
        warnings.push(`商人价格${p}远超玩家当前金币(${player.stats.gold})，可能无法购买`);
      }
    }
  }

  const worldMax = WORLD_MAX_PRICES[player.progress.sceneType] || MAX_GOLD_PRICE;
  if (priceMatch) {
    for (const p of priceMatch) {
      const amount = parseInt(p.match(/\d+/)?.[0] || '0');
      if (amount > worldMax) {
        warnings.push(`商人价格${p}超出当前世界(${player.progress.sceneType})物价上限${worldMax}金`);
      }
    }
  }

  const modernItems = ['手机', '电脑', '芯片', '程序', 'AI', '机甲', '赛博'];
  const cultivationItems = ['丹药', '法宝', '灵石', '功法', '飞剑', '仙器', '符箓'];
  const worldType = player.progress.sceneType;

  for (const item of modernItems) {
    if (combinedText.includes(item) && (worldType === 'cultivation' || worldType === 'hidden_immortal')) {
      warnings.push(`修仙世界中出现了现代物品「${item}」，可能不合设定`);
    }
  }
  for (const item of cultivationItems) {
    if (combinedText.includes(item) && (worldType === 'modern_city' || worldType === 'hidden_cyber')) {
      warnings.push(`现代/赛博世界中出现了修仙物品「${item}」，可能不合设定`);
    }
  }
}

export function buildRetryPrompt(errors: string[]): string {
  if (errors.length === 0) return '';
  return `\n[生成错误：${errors.join('；')}。请重新生成，避免上述问题。]`;
}
