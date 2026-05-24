import type { Player, SystemHistory, Artifact, Item, Attributes } from '../types';
import type { CheckInResult, CheckInQuality, SystemReward } from './types';
import { getSystemPersona } from './personaActor';
import { randomInt } from '../utils/random';

// ============================================================
// 签到品质梯度
// ============================================================

const STREAK_MILESTONES: { minStreak: number; quality: CheckInQuality }[] = [
  { minStreak: 15, quality: 'mythic' },
  { minStreak: 7, quality: 'legendary' },
  { minStreak: 3, quality: 'epic' },
  { minStreak: 1, quality: 'common' },
];

export function getCheckInQuality(streak: number): CheckInQuality {
  for (const m of STREAK_MILESTONES) {
    if (streak >= m.minStreak) return m.quality;
  }
  return 'common';
}

// ============================================================
// SystemHistory
// ============================================================

export function createSystemHistory(): SystemHistory {
  return {
    checkInStreak: 0,
    lastCheckInRound: 0,
    lastRewardItemIds: [],
    totalGoldIssued: 0,
    artifactIssueHistory: [],
  };
}

// ============================================================
// 成长型道具模板
// ============================================================

const ARTIFACT_TEMPLATES: Record<string, Omit<Artifact, 'upgradeLevel' | 'cooldown'>> = {
  small_green_bottle: {
    id: 'small_green_bottle',
    name: '小绿瓶',
    type: 'growth_artifact',
    quality: 'legendary',
    abilities: [
      '吸收月华凝结灵液，可催熟普通灵植',
      '灵液纯度提升，可催熟稀有灵植',
      '灵液可加速自身修炼速度',
      '可产出极品灵液，催熟传说级灵植',
      '一念之间催熟万年灵药，炼丹宗师的终极神器',
    ],
    maxUpgradeLevel: 5,
    maxCooldown: 3,
    description: '看似平凡的小绿瓶，却能吸收月华凝结灵液。天下灵植，皆可催熟。',
  },
  realm_breaker: {
    id: 'realm_breaker',
    name: '破界珠',
    type: 'growth_artifact',
    quality: 'legendary',
    abilities: [
      '每日一次空间跳跃，跨越短距离障碍',
      '跳跃距离大幅提升，可穿越阵法封锁',
      '空间感知增强，可发现隐藏的秘境入口',
      '可跨越世界壁垒进行跨界旅行',
      '一念之间穿梭万界，空间法则尽在掌握',
    ],
    maxUpgradeLevel: 5,
    maxCooldown: 10,
    description: '蕴含空间法则的宝珠，持有者可突破空间壁垒，自由穿梭于诸界之间。',
  },
  fate_wheel: {
    id: 'fate_wheel',
    name: '命运轮盘',
    type: 'growth_artifact',
    quality: 'legendary',
    abilities: [
      '每日转动一次，随机获得属性临时提升或诅咒',
      '可感知即将到来的厄运并提前预警',
      '可消耗转动次数影响他人的运势',
      '可窥见命运的碎片，预知重大事件走向',
      '主宰自身命运，免疫一切命运类诅咒和预言',
    ],
    maxUpgradeLevel: 5,
    maxCooldown: 1,
    description: '刻满星象的轮盘，每日可转动一次。命运的对赌——你今天转了吗？',
  },
  memory_book: {
    id: 'memory_book',
    name: '记忆之书',
    type: 'growth_artifact',
    quality: 'legendary',
    abilities: [
      '自动记录所有已发生事件，可回放剧情细节',
      '识别环境中的谎言与幻觉',
      '根据历史记录预判敌人行动模式',
      '可提取遗忘的记忆碎片，揭示隐藏线索',
      '记忆即力量——可将历史事件转化为战斗经验和属性加成',
    ],
    maxUpgradeLevel: 5,
    maxCooldown: 5,
    description: '此书自动记录一切，防幻觉、识谎言、预判走向——信息就是力量。',
  },
};

function createArtifactFromTemplate(templateId: string): Artifact {
  const tpl = ARTIFACT_TEMPLATES[templateId];
  return {
    id: tpl.id,
    name: tpl.name,
    type: tpl.type,
    quality: tpl.quality,
    abilities: [...tpl.abilities],
    upgradeLevel: 1,
    maxUpgradeLevel: tpl.maxUpgradeLevel,
    cooldown: 0,
    maxCooldown: tpl.maxCooldown,
    description: tpl.description,
  };
}

// ============================================================
// 奖励池
// ============================================================

const GOLD_BY_QUALITY: Record<CheckInQuality, { min: number; max: number }> = {
  common: { min: 50, max: 100 },
  epic: { min: 150, max: 250 },
  legendary: { min: 250, max: 400 },
  mythic: { min: 400, max: 600 },
};

const EXP_BY_QUALITY: Record<CheckInQuality, { min: number; max: number }> = {
  common: { min: 10, max: 30 },
  epic: { min: 40, max: 80 },
  legendary: { min: 80, max: 150 },
  mythic: { min: 150, max: 300 },
};

// 道具发放顺序：确保不重复，优先发未持有的
const ARTIFACT_ISSUE_ORDER = ['small_green_bottle', 'realm_breaker', 'fate_wheel', 'memory_book'];

// ============================================================
// 签到处理
// ============================================================

export function processDailyCheckIn(player: Player, history: SystemHistory): CheckInResult {
  const currentRound = player.progress.round;

  // 已签到
  if (history.lastCheckInRound >= currentRound) {
    return {
      canCheckIn: false,
      streak: history.checkInStreak,
      quality: getCheckInQuality(history.checkInStreak),
      rewards: [],
      dialogue: '',
    };
  }

  // 断签检测：超过 1 回合未签到
  const streakBroken = currentRound - history.lastCheckInRound > 1 && history.lastCheckInRound > 0;
  const newStreak = streakBroken ? 1 : history.checkInStreak + 1;
  const quality = getCheckInQuality(newStreak);

  const rewards = generateCheckInRewards(quality, newStreak, player, history);

  // 道具去重：不发已经持有或已发过的 artifact
  const filteredRewards = rewards.filter((r) => {
    if (r.type === 'artifact' && r.artifact) {
      const alreadyOwned = player.artifacts.some((a) => a.id === r.artifact!.id);
      const alreadyIssued = history.artifactIssueHistory.some(
        (h) => h.artifactId === r.artifact!.id,
      );
      return !alreadyOwned && !alreadyIssued;
    }
    if (r.type === 'item' && r.item) {
      return !history.lastRewardItemIds.includes(r.item.id);
    }
    return true;
  });

  const dialogue = generateCheckInDialogue(player, quality, newStreak, filteredRewards, streakBroken);
  const storyHook = buildStoryHook(quality, filteredRewards);

  return {
    canCheckIn: true,
    streak: newStreak,
    quality,
    rewards: filteredRewards,
    dialogue,
    storyHook,
  };
}

function generateCheckInRewards(
  quality: CheckInQuality,
  streak: number,
  player: Player,
  history: SystemHistory,
): SystemReward[] {
  const rewards: SystemReward[] = [];

  // 金币
  const goldRange = GOLD_BY_QUALITY[quality];
  const goldAmount = randomInt(goldRange.min, goldRange.max);
  rewards.push({ type: 'gold', amount: goldAmount, description: `${goldAmount} 金币` });

  // 经验
  const expRange = EXP_BY_QUALITY[quality];
  const expAmount = randomInt(expRange.min, expRange.max);
  rewards.push({ type: 'exp', amount: expAmount, description: `${expAmount} 经验` });

  // 道具/artifact: epic+ 才发
  if (quality === 'epic') {
    const item = generateEpicItem(player);
    if (item) rewards.push({ type: 'item', item, description: item.name });
  }

  if (quality === 'legendary') {
    // 7天里程碑 → 传说成长型道具
    const artifact = pickNextArtifact(player, history);
    if (artifact) {
      rewards.push({ type: 'artifact', artifact, description: artifact.name });
    }
  }

  if (quality === 'mythic') {
    // 15天里程碑 → 升级现有 artifact 或发放新 artifact
    const existing = player.artifacts.find((a) => a.upgradeLevel < a.maxUpgradeLevel);
    if (existing) {
      rewards.push({
        type: 'artifact',
        artifact: { ...existing, upgradeLevel: existing.upgradeLevel + 1 },
        description: `${existing.name} 升级至 Lv.${existing.upgradeLevel + 1}`,
      });
    } else {
      const artifact = pickNextArtifact(player, history);
      if (artifact) {
        rewards.push({ type: 'artifact', artifact, description: artifact.name });
      }
    }
    // 神话签到额外属性加成
    const attrBoost = pickAttributeBoost(player);
    rewards.push({
      type: 'attribute',
      attribute: attrBoost,
      description: Object.entries(attrBoost).map(([k, v]) => `${k}+${v}`).join(' '),
    });
  }

  return rewards;
}

function pickNextArtifact(player: Player, history: SystemHistory): Artifact | null {
  for (const id of ARTIFACT_ISSUE_ORDER) {
    const owned = player.artifacts.some((a) => a.id === id);
    const issued = history.artifactIssueHistory.some((h) => h.artifactId === id);
    if (!owned && !issued) {
      return createArtifactFromTemplate(id);
    }
  }
  return null;
}

function generateEpicItem(player: Player): Item | null {
  const epicItems: Item[] = [
    { id: 'spirit_pill', name: '聚灵丹', description: '短时间内大幅提升灵力恢复速度', rarity: 'epic', type: 'consumable', effect: { mp: 50 } },
    { id: 'body_refine_pill', name: '锻体丹', description: '强化肉身，永久提升体质', rarity: 'epic', type: 'consumable', effect: { physique: 1, maxHp: 30 } },
    { id: 'lucky_charm', name: '幸运符', description: '刻有转运符文的护符，佩戴后运气提升', rarity: 'epic', type: 'material', effect: { luck: 2 } },
    { id: 'skill_scroll', name: '随机技能书', description: '记载着一种随机技能的卷轴', rarity: 'epic', type: 'skill_book' },
    { id: 'escape_talisman', name: '遁空符', description: '捏碎后可瞬间传送到安全位置', rarity: 'epic', type: 'consumable' },
    { id: 'healing_elixir', name: '回春灵液', description: '强力治疗药水，恢复大量生命值', rarity: 'epic', type: 'consumable', effect: { hp: 80 } },
  ];

  return epicItems[randomInt(0, epicItems.length - 1)] || null;
}

function pickAttributeBoost(player: Player): Partial<Attributes> {
  const attrs: (keyof Attributes)[] = ['talent', 'intelligence', 'physique', 'appearance', 'family', 'luck'];
  const shuffled = [...attrs].sort(() => Math.random() - 0.5);
  const boost: Partial<Attributes> = {};
  (shuffled[0] as keyof Attributes) && (boost[shuffled[0]] = 2);
  (shuffled[1] as keyof Attributes) && (boost[shuffled[1]] = 1);
  return boost;
}

// ============================================================
// 系统对话生成
// ============================================================

const CHECK_IN_DIALOGUES: Record<CheckInQuality, string[]> = {
  common: [
    '叮！又是平凡的一天呢~宿主记得签到，很好很好。',
    '叮！每日签到完成。虽然奖励不多，但积少成多嘛。',
    '叮！签到打卡！本系统都感动得要死机了。',
  ],
  epic: [
    '叮！连续签到成就达成！宿主坚持得不错，奖励升级！命运的齿轮开始转动...',
    '叮！检测到宿主诚意满满，本系统决定赏你点好东西。',
    '叮！签到第三天——系统判定：此人可信，追加奖励！',
  ],
  legendary: [
    '叮！连续签到7天成就达成！本系统决定赏你一件货真价实的逆天宝贝。请谨慎使用。',
    '叮！七日之约已成。天不生你，万古如长夜！接好你的传说级奖励！',
    '叮！燃起来了！宿主连续7天签到，超越99%的穿越者。传说道具已发放至背包！',
  ],
  mythic: [
    '叮！连续签到15天——神话成就解锁！宿主，你已证明了自己的毅力。从今日起，你不再只是签到者，你是天道的宠儿！',
    '叮！十五日天道之约已成。本系统宣布：宿主已进入神话领域。奖励已超越凡俗理解范围。',
    '叮！十五天！整整十五天！宿主，你就是签到界的传奇！本系统都被你感动了——接好你的神话奖励！',
  ],
};

const BROKEN_STREAK_DIALOGUES = [
  '叮！检测到签到中断...宿主，坚持才是胜利啊。连签天数已重置。',
  '叮！断签了！Σ(っ°Д°;)っ 宿主的连签奖励从头开始了...',
  '叮...签到断了一天。本系统很失望，奖励降级处理。',
];

function generateCheckInDialogue(
  player: Player,
  quality: CheckInQuality,
  streak: number,
  rewards: SystemReward[],
  streakBroken: boolean,
): string {
  const persona = getSystemPersona(player);

  if (streakBroken) {
    return BROKEN_STREAK_DIALOGUES[randomInt(0, BROKEN_STREAK_DIALOGUES.length - 1)];
  }

  const pool = CHECK_IN_DIALOGUES[quality];
  let base = pool[randomInt(0, pool.length - 1)];

  // 追加奖励概述
  const rewardSummary = rewards.map((r) => r.description).join('、');
  if (rewardSummary) {
    base += ` | 奖励：${rewardSummary}`;
  }

  // 注入性格口头禅
  if (!base.startsWith(persona.catchphrase)) {
    base = `${persona.catchphrase} ${base}`;
  }

  return base;
}

function buildStoryHook(quality: CheckInQuality, rewards: SystemReward[]): string | undefined {
  const artifactReward = rewards.find((r) => r.type === 'artifact');
  if (artifactReward && artifactReward.artifact) {
    const a = artifactReward.artifact;
    const hooks: Record<string, string> = {
      small_green_bottle: '小绿瓶待使用——需在3回合内安排灵植/炼丹相关场景',
      realm_breaker: '破界珠待使用——需在3回合内安排空间穿越/逃离险境场景',
      fate_wheel: '命运轮盘待使用——需在3回合内安排命运抉择/赌运场景',
      memory_book: '记忆之书待使用——需在3回合内安排识破谎言/回顾线索场景',
    };
    return hooks[a.id] || `${a.name}待使用——需在3回合内安排道具高光场景`;
  }
  return undefined;
}

// ============================================================
// 热梗选取
// ============================================================

const MEME_BANK: Record<string, string[]> = {
  check_in: ['命运的齿轮开始转动', '遥遥领先', '今日我若冷眼旁观', '命运的齿轮从未停止转动'],
  legendary: ['天不生你万古如长夜', '燃起来了', '全场最佳', '隐藏款奖励触发'],
  mythic: ['超越彼岸', '破碎虚空', '终极觉醒', '赌上一切的觉悟'],
};

export function getMemesForTrigger(trigger: string): string[] {
  return MEME_BANK[trigger] || [];
}

// ============================================================
// 任务进度更新（规则驱动）
// ============================================================

export function updateSystemTaskProgress(
  tasks: import('../types').Task[],
  player: Player,
  choiceId: string | undefined,
): import('./types').TaskProgressUpdate[] {
  const updates: import('./types').TaskProgressUpdate[] = [];

  for (const task of tasks) {
    if (task.completed) continue;

    let shouldProgress = false;

    switch (task.targetType) {
      case 'survive':
      case 'explore':
        shouldProgress = true;
        break;
      case 'combat':
        shouldProgress = choiceId === 'fight' || choiceId === 'skill';
        break;
      case 'social':
        shouldProgress = !!choiceId && [
          'trade', 'learn', 'recruit', 'meet', 'befriend', 'cooperate',
          'talk', 'drink', 'exchange', 'join', 'help', 'ask', 'listen',
          'accept', 'free', 'comfort', 'buy',
        ].includes(choiceId);
        break;
      case 'wealth':
        shouldProgress = player.stats.wealth >= task.targetValue;
        break;
      case 'level':
        shouldProgress = player.stats.level >= task.targetValue;
        break;
    }

    if (shouldProgress) {
      const newProgress = task.progress + 1;
      updates.push({
        taskId: task.id,
        newProgress,
        isCompleted: newProgress >= task.targetRounds,
      });
    }
  }

  return updates;
}
