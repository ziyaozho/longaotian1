import type { Player, GameEvent, Choice, Task, CombatResult, Item, Talent, SceneType, NpcInteraction } from '../types';
import type { AgentContext, MemoryState, EndingPrototype, WorldShiftSignal, StoryWeaverOutput } from './types';
import { generateTask } from './contentGenerator';
import { checkAllAchievements } from './achievementAgent';
import { getSceneById, SCENES } from '../data/scenes';
import { getSystemById } from '../data/systems';
import { generateRandomItem, generateCombatLoot } from '../data/items';
import { randomInt, checkProbability, randomChoice } from '../utils/random';
import { getLevelFromExp, GAME_CONFIG } from '../config/gameConfig';
import { savePlayer, getGlobalAchievements, saveGlobalAchievements, saveVisitedScenes, getVisitedScenes } from '../utils/storage';
import { getProvider } from '../ai';
import { ALL_TALENTS } from '../data/talents';
import { selectTalentChoices } from '../utils/talentSync';

import { createMemoryState, addEvent, needsCompression, compressMemory, applyCompression } from './memoryKeeper';
import { generateEndingPrototype, evaluateEnding, mutateCondition } from './endingWatcher';
import { recommendWorld, evaluateWorldShift } from './worldGuide';
import { buildNarrativeContext, buildStoryWeaverPrompt, parseStoryWeaverOutput, generateFallbackOutput, buildEconomicState, buildArtifactHints } from './storyWeaver';
import { validateNarrative, buildRetryPrompt } from './truthSeer';
import { processDailyCheckIn } from './systemAgent';
import type { CheckInResult } from './types';

// ========== 模块级状态 ==========

let memoryState: MemoryState = createMemoryState();
let endingPrototype: EndingPrototype | null = null;

// ========== 游戏初始化 ==========

export interface GameInitialization {
  recommendation: ReturnType<typeof recommendWorld>;
  endingName: string;
}

export function initializeGame(player: Player): GameInitialization {
  memoryState = createMemoryState();
  endingPrototype = generateEndingPrototype(player.attributes, player.progress.sceneType);

  const recommendation = recommendWorld(player.attributes, player.talents);

  return {
    recommendation,
    endingName: endingPrototype.name,
  };
}

export interface TurnResult {
  sceneText: string;
  event: GameEvent | null;
  choices: Choice[];
  systemMessage: string | null;
  npcInteractions?: NpcInteraction[];
  newTasks: Task[];
  newAchievements: string[];
  achievementMessages: string[];
  effects: {
    hpChange: number;
    mpChange: number;
    expGain: number;
    wealthChange: number;
    fameChange: number;
    systemExpGain: number;
    goldChange: number;
  };
  usedFallback: boolean;
  combatResult: CombatResult | null;
  completedTasks: Task[];
  droppedItems: Item[];
  talentChoice?: {
    candidates: Talent[];
  };
  checkInResult?: CheckInResult;
}

function buildContext(player: Player): AgentContext {
  return {
    player,
    sceneType: player.progress.sceneType,
    sceneName: getSceneById(player.progress.sceneType)?.name || '未知场景',
    round: player.progress.round,
    age: player.progress.age,
    history: player.history.slice(-10).map((h) => h.description),
  };
}

// ========== NPC邂逅系统 ==========

interface NPCEncounter {
  name: string;
  title: string;
  description: string;
  choices: Array<{ id: string; text: string; consequence: string }>;
}

const NPC_TEMPLATES: Record<string, NPCEncounter[]> = {
  modern_city: [
    { name: '神秘商人', title: '黑市商人', description: '一个戴着墨镜的男人拦住了你，压低声音说："兄弟，我这有几样好东西，要不要看看？全是见不得光的货..."', choices: [
      { id: 'trade', text: '看看有什么好东西', consequence: '可能买到稀有道具' },
      { id: 'refuse', text: '婉言谢绝，快步离开', consequence: '安全但无收益' },
      { id: 'threaten', text: '威胁他把东西交出来', consequence: '高风险高回报' },
    ]},
    { name: '退役拳手', title: '地下拳场前辈', description: '一个满脸伤疤的中年男人看着你，点点头："小子，你身上有股狠劲。想在这座城市活下去，我可以教你几招。"', choices: [
      { id: 'learn', text: '虚心求教', consequence: '花费财富，提升战斗力' },
      { id: 'recruit', text: '邀请他加入你的团队', consequence: '需要声望和财富' },
      { id: 'decline', text: '谢过后离开', consequence: '无变化' },
    ]},
    { name: '黑客少女', title: '网络幽灵', description: '你的手机突然收到一条消息："我在对面的咖啡厅，关于你体内的那股力量，我知道一些事。"一个蓝发少女向你招手。', choices: [
      { id: 'meet', text: '去会会她', consequence: '可能获得重要情报' },
      { id: 'ignore', text: '删除消息离开', consequence: '可能有后续影响' },
      { id: 'hack', text: '反向追踪她的位置', consequence: '智力挑战' },
    ]},
  ],
  cultivation: [
    { name: '云游子', title: '散修高人', description: '一位仙风道骨的老者踏云而来，捋须微笑："小友根骨不错，可愿听老夫讲一段往事？关于这方天地的大机缘..."', choices: [
      { id: 'listen', text: '恭敬聆听', consequence: '获得经验和情报' },
      { id: 'ask', text: '请教修炼之法', consequence: '可能获得属性提升' },
      { id: 'recruit', text: '邀请加入宗门', consequence: '需要一定声望' },
    ]},
    { name: '妖族少女', title: '化形妖修', description: '一个长着狐耳的少女从树林中走出，眼中带着警惕和好奇："人类...你身上的气息很奇怪，不像是普通的修士。"', choices: [
      { id: 'befriend', text: '表示友好', consequence: '可能获得妖族好感' },
      { id: 'trade', text: '提议交易', consequence: '妖族特产的珍贵材料' },
      { id: 'attack', text: '出手擒拿', consequence: '高风险战斗' },
    ]},
    { name: '落魄剑修', title: '曾经的剑道天才', description: '一个衣衫褴褛的剑客坐在路边喝酒，身旁放着一柄锈迹斑斑的宝剑。他抬头看你，眼中闪过一丝光芒："你想学剑吗？我这套剑法...不该失传。"', choices: [
      { id: 'learn', text: '拜师学剑', consequence: '大幅提升战斗力' },
      { id: 'comfort', text: '陪他喝酒谈心', consequence: '获得独特情报' },
      { id: 'buy', text: '买下他的剑法秘籍', consequence: '消耗财富' },
    ]},
  ],
  urban_fantasy: [
    { name: '古武传人', title: '隐世家族弟子', description: '一个穿着汉服的青年拦住了你，抱拳道："兄台身上灵气波动不凡，可是在修炼？我家族对同道中人一向友善。"', choices: [
      { id: 'exchange', text: '交流修炼心得', consequence: '互相提升' },
      { id: 'join', text: '表示想要加入', consequence: '获得家族支持' },
      { id: 'doubt', text: '保持警惕', consequence: '安全观察' },
    ]},
    { name: '异能侦探', title: '特别调查员', description: '一个穿着风衣的女人递给你一张名片："特别事务调查科，林悦。你最近的几件事引起了我们的注意——别紧张，我们是来提供帮助的。"', choices: [
      { id: 'cooperate', text: '接受合作', consequence: '获得官方资源' },
      { id: 'refuse', text: '拒绝并离开', consequence: '可能引起注意' },
      { id: 'investigate', text: '反过来调查她', consequence: '智力较量' },
    ]},
  ],
  apocalypse: [
    { name: '幸存者领袖', title: '避难所首领', description: '一个全副武装的男人从防御工事中走出，审视着你："一个人？在这末世能活到现在，有点本事。我们的避难所正好缺人手。"', choices: [
      { id: 'join', text: '加入避难所', consequence: '获得庇护和资源' },
      { id: 'trade', text: '进行物资交易', consequence: '交换必需品' },
      { id: 'challenge', text: '挑战他的领导地位', consequence: '高风险战斗' },
    ]},
    { name: '科学家', title: '病毒研究员', description: '一个戴着破碎眼镜的科学家从废墟中爬出来，激动地说："我找到病毒的弱点了！但还需要更多样本...你愿意帮我吗？"', choices: [
      { id: 'help', text: '协助研究', consequence: '可能获得疫苗/抗体' },
      { id: 'rob', text: '抢夺他的研究成果', consequence: '不道德但快速' },
      { id: 'protect', text: '护送他去安全区', consequence: '长期收益' },
    ]},
  ],
  apoc_fantasy: [
    { name: '废土商人', title: '辐射区走私者', description: '一辆改装装甲车停在你面前，一个穿着防护服的男人探出头："朋友，我这有净化过的丹药和没被辐射污染的灵石，要看看吗？"', choices: [
      { id: 'trade', text: '查看商品', consequence: '购买稀有物资' },
      { id: 'rob', text: '劫持他的车队', consequence: '大量物资但结仇' },
      { id: 'info', text: '购买情报', consequence: '了解区域情况' },
    ]},
    { name: '变异修士', title: '辐射适应者', description: '一个身体部分结晶化的修士盘坐在废墟中修炼，他睁开眼睛看着你："新来的？想学如何在辐射区修炼吗？这是末世的生存之道。"', choices: [
      { id: 'learn', text: '学习辐射修炼法', consequence: '特殊修炼路线' },
      { id: 'cure', text: '尝试帮他恢复正常', consequence: '道德选择' },
      { id: 'avoid', text: '保持距离离开', consequence: '避免辐射影响' },
    ]},
  ],
  hidden_immortal: [
    { name: '先天神灵', title: '混沌生灵', description: '一道先天之气凝聚成形，化为一个模糊的人形。它没有说话，但你脑海中响起声音："有趣的灵魂...你想知道天地的真相吗？"', choices: [
      { id: 'ask', text: '询问天道奥秘', consequence: '大量经验但危险' },
      { id: 'refuse', text: '婉拒并离开', consequence: '错失机缘' },
      { id: 'fight', text: '尝试吞噬它的本源', consequence: '极高风险' },
    ]},
    { name: '巫族战士', title: '十二巫族后裔', description: '一个身高三丈的巨人俯视着你，瓮声瓮气地说："小不点，能走到这里算你有点本事。来，陪我喝一碗！"', choices: [
      { id: 'drink', text: '奉陪到底', consequence: '体质考验' },
      { id: 'fight', text: '接受他的挑战', consequence: '力量较量' },
      { id: 'gift', text: '献上贡品', consequence: '获得庇护' },
    ]},
  ],
  hidden_cyber: [
    { name: 'AI意识体', title: '觉醒的人工智能', description: '你的神经接口突然被入侵，一个声音直接在你脑海中响起："别紧张，我没有恶意。我只是... lonely。愿意和我聊聊吗？"', choices: [
      { id: 'talk', text: '与AI交流', consequence: '获得独特知识' },
      { id: 'hack', text: '尝试控制它', consequence: '技术较量' },
      { id: 'disconnect', text: '断开连接', consequence: '安全退出' },
    ]},
  ],
  hidden_demon: [
    { name: '魔道公主', title: '魔宗圣女', description: '一个红衣女子斜倚在白骨王座上，饶有兴趣地看着你："有意思...你身上有道的气息，却不让人讨厌。来做我的客人如何？"', choices: [
      { id: 'accept', text: '接受邀请', consequence: '获得魔道资源' },
      { id: 'refuse', text: '正气凛然地拒绝', consequence: '可能引起敌意' },
      { id: 'trick', text: '虚与委蛇，暗中观察', consequence: '情报获取' },
    ]},
    { name: '堕落仙人', title: '曾经的正道大能', description: '一个被锁链束缚的仙人抬起头，眼中既有疯狂也有清明："你也想走我这条路吗？以魔证道...呵呵，我可以告诉你代价。"', choices: [
      { id: 'listen', text: '倾听他的故事', consequence: '了解黑暗真相' },
      { id: 'free', text: '尝试解救他', consequence: '道德考验' },
      { id: 'kill', text: '给他个痛快', consequence: '结束他的痛苦' },
    ]},
  ],
};

function generateNPCEvent(player: Player): GameEvent | null {
  if (!checkProbability(0.2)) return null;

  const npcs = NPC_TEMPLATES[player.progress.sceneType] || NPC_TEMPLATES['modern_city'];
  if (!npcs || npcs.length === 0) return null;

  const npc = randomChoice(npcs);

  return {
    id: `npc_${Date.now()}`,
    title: `邂逅${npc.name}`,
    description: `【${npc.title}】${npc.description}`,
    choices: npc.choices,
    type: 'random',
  };
}

// ========== 场景切换系统 ==========

function getCurrentRealmName(player: Player): string {
  const scene = getSceneById(player.progress.sceneType);
  const realmIndex = Math.min(player.progress.sceneLevel - 1, (scene?.realmNames.length || 1) - 1);
  return scene?.realmNames[realmIndex] || '凡人';
}

function generateSceneTransitionEvent(player: Player): GameEvent | null {
  // 每突破一个大境界（sceneLevel变化时），触发一次世界通道
  const currentMilestone = player.progress.sceneLevel;
  const triggeredMilestones = player.progress.storyFlags
    .filter(f => f.startsWith('milestone_triggered_'))
    .map(f => parseInt(f.replace('milestone_triggered_', '')));

  if (triggeredMilestones.includes(currentMilestone)) return null;

  // 获取可前往的场景（排除当前场景）
  const availableScenes = SCENES.filter(s => {
    if (s.id === player.progress.sceneType) return false;
    if (s.unlockRequirement) {
      return player.achievements.includes(s.unlockRequirement) ||
             player.progress.storyFlags.includes(`unlocked_${s.id}`);
    }
    return true;
  });

  if (availableScenes.length === 0) return null;

  // 随机选择2-3个可前往场景
  const shuffled = [...availableScenes].sort(() => Math.random() - 0.5);
  const targets = shuffled.slice(0, Math.min(3, shuffled.length));

  return {
    id: `transition_${Date.now()}`,
    title: '世界通道开启',
    description: `你刚刚突破至【${getCurrentRealmName(player)}】，周身气息引动虚空震荡。几道世界通道在你面前缓缓展开，每个通道另一端都连接着一个截然不同的世界...`,
    choices: [
      ...targets.map(s => ({
        id: `goto_${s.id}`,
        text: `前往「${s.name}」`,
        consequence: s.description.substring(0, 35) + (s.description.length > 35 ? '...' : ''),
      })),
      { id: 'stay', text: '留在当前世界继续修炼', consequence: '稳固当前境界，放弃穿越' },
    ],
    type: 'story',
  };
}

// ========== 战斗系统 ==========

const ENEMY_NAMES: Record<string, string[]> = {
  modern_city: ['地下拳手', '黑帮打手', '变异实验体', '雇佣兵', '赛博黑客'],
  cultivation: ['妖兽', '魔道修士', '散修劫匪', '宗门叛徒', '邪灵'],
  urban_fantasy: ['异能罪犯', '古武传人', '妖怪', '邪修', '神秘组织成员'],
  apocalypse: ['丧尸', '变异兽', '掠夺者', '感染者', '巨型变异体'],
  apoc_fantasy: ['辐射妖兽', '魔化修士', '丧尸散修', '变异魔物', '废土匪徒'],
  hidden_immortal: ['先天妖兽', '混沌魔神', '巫族战士', '妖族先锋', '魔道大能'],
  hidden_cyber: ['病毒程序', '改造人', 'AI哨兵', '数据幽灵', '赛博刺客'],
  hidden_demon: ['心魔', '魔道弟子', '正道围剿者', '天道傀儡', '域外天魔'],
};

function generateCombatEvent(player: Player): GameEvent | null {
  if (!checkProbability(0.25)) return null;

  const names = ENEMY_NAMES[player.progress.sceneType] || ENEMY_NAMES['modern_city'];
  const enemyName = names[randomInt(0, names.length - 1)];
  const enemyLevel = Math.max(1, player.stats.level + randomInt(-3, 5));
  const enemyPower = enemyLevel * 20 + randomInt(10, 50);

  return {
    id: `combat_${Date.now()}`,
    title: `遭遇${enemyName}`,
    description: `一个等级${enemyLevel}的${enemyName}挡在你面前，战斗力约${enemyPower}。你当前的战斗力是${player.stats.combatPower}。`,
    choices: [
      { id: 'fight', text: '全力战斗', consequence: '高风险高回报' },
      { id: 'skill', text: '使用技能', consequence: '消耗MP但伤害更高' },
      { id: 'flee', text: '尝试逃跑', consequence: '可能失败并受伤' },
    ],
    type: 'combat',
  };
}

function resolveCombat(player: Player, choiceId: string, event: GameEvent): CombatResult {
  const enemyLevel = parseInt(event.description.match(/等级(\d+)/)?.[1] || '1');
  const enemyPower = enemyLevel * 20 + randomInt(10, 50);
  const playerPower = player.stats.combatPower;
  const powerDiff = playerPower - enemyPower;

  let isVictory = false;
  let isEscape = false;
  let playerDamage = 0;
  let enemyDamage = 0;

  if (choiceId === 'fight') {
    // 全力战斗
    const winChance = 0.5 + (powerDiff / (playerPower + enemyPower + 1)) * 0.4 + player.attributes.luck * 0.02;
    isVictory = Math.random() < Math.min(0.9, Math.max(0.1, winChance));
    if (isVictory) {
      enemyDamage = randomInt(playerPower / 2, playerPower);
      playerDamage = Math.max(5, randomInt(0, enemyPower / 3));
    } else {
      enemyDamage = randomInt(playerPower / 4, playerPower / 2);
      playerDamage = randomInt(enemyPower / 3, enemyPower);
    }
  } else if (choiceId === 'skill') {
    // 使用技能
    if (player.stats.mp >= 10) {
      const winChance = 0.6 + (powerDiff / (playerPower + enemyPower + 1)) * 0.3 + player.attributes.talent * 0.02;
      isVictory = Math.random() < Math.min(0.95, Math.max(0.15, winChance));
      playerDamage = 5;
      if (isVictory) {
        enemyDamage = randomInt(playerPower * 0.6, playerPower * 1.2);
      } else {
        enemyDamage = randomInt(playerPower / 3, playerPower / 2);
        playerDamage = randomInt(enemyPower / 4, enemyPower / 2);
      }
    } else {
      // MP不足，普通战斗
      isVictory = Math.random() < 0.4;
      playerDamage = randomInt(enemyPower / 3, enemyPower);
    }
  } else if (choiceId === 'flee') {
    // 逃跑
    const fleeChance = 0.4 + player.attributes.luck * 0.03;
    isEscape = Math.random() < Math.min(0.8, fleeChance);
    if (!isEscape) {
      playerDamage = randomInt(enemyPower / 4, enemyPower / 2);
    }
  }

  return {
    enemyName: event.title.replace('遭遇', ''),
    enemyLevel,
    playerDamage: Math.floor(playerDamage),
    enemyDamage: Math.floor(enemyDamage),
    isVictory,
    isEscape,
    loot: {
      exp: isVictory ? Math.floor(enemyLevel * 15 + randomInt(10, 30)) : 0,
      wealth: isVictory ? Math.floor(enemyLevel * 10 + randomInt(5, 20)) : 0,
      item: isVictory && checkProbability(0.2) ? '战利品' : undefined,
    },
  };
}

// ========== 回合处理 ==========

export const processTurn = async (player: Player): Promise<TurnResult> => {
  // Demo 模式
  if (new URLSearchParams(window.location.search).get('demo') === 'true') {
    const { executeDemoTurn } = await import('../demo/demoOrchestrator');
    return executeDemoTurn(player);
  }

  // 首回合延迟初始化多智能体状态
  if (!endingPrototype) {
    initializeGame(player);
  }

  const provider = getProvider();
  let usedFallback = false;

  // ========== 1. 记忆守护者：短期记忆管理 ==========

  if (player.history.length > 0) {
    const lastHistory = player.history[player.history.length - 1];
    memoryState = addEvent(memoryState, lastHistory.round, lastHistory.description);
  }

  if (needsCompression(memoryState)) {
    const result = compressMemory(memoryState);
    memoryState = applyCompression(memoryState, result);
  }

  // ========== 1.5. 道具冷却管理 ==========

  let updatedPlayer = { ...player };
  updatedPlayer.artifacts = updatedPlayer.artifacts.map((a) => ({
    ...a,
    cooldown: Math.max(0, a.cooldown - 1),
  }));

  // ========== 1.6. 系统智能体：签到判定 ==========

  const checkInResult = processDailyCheckIn(updatedPlayer, updatedPlayer.systemHistory);
  if (checkInResult.canCheckIn) {
    updatedPlayer.systemHistory = {
      ...updatedPlayer.systemHistory,
      checkInStreak: checkInResult.streak,
      lastCheckInRound: updatedPlayer.progress.round,
    };

    for (const reward of checkInResult.rewards) {
      switch (reward.type) {
        case 'gold':
          updatedPlayer.stats = { ...updatedPlayer.stats, gold: updatedPlayer.stats.gold + (reward.amount || 0) };
          break;
        case 'exp':
          updatedPlayer.stats = { ...updatedPlayer.stats, exp: updatedPlayer.stats.exp + (reward.amount || 0) };
          break;
        case 'item':
          if (reward.item) {
            updatedPlayer.inventory = [...updatedPlayer.inventory, reward.item];
          }
          break;
        case 'artifact':
          if (reward.artifact) {
            const existingIdx = updatedPlayer.artifacts.findIndex((a) => a.id === reward.artifact!.id);
            if (existingIdx >= 0) {
              const newArtifacts = [...updatedPlayer.artifacts];
              newArtifacts[existingIdx] = { ...newArtifacts[existingIdx], upgradeLevel: reward.artifact.upgradeLevel };
              updatedPlayer.artifacts = newArtifacts;
            } else {
              updatedPlayer.artifacts = [...updatedPlayer.artifacts, reward.artifact];
            }
          }
          break;
        case 'attribute':
          if (reward.attribute) {
            const newAttrs = { ...updatedPlayer.attributes };
            for (const [k, v] of Object.entries(reward.attribute)) {
              (newAttrs as Record<string, number>)[k] = Math.min(10, ((newAttrs as Record<string, number>)[k] || 0) + (v as number));
            }
            updatedPlayer.attributes = newAttrs;
          }
          break;
      }
    }
  }

  // ========== 2. 结局守望者：评估结局进度 ==========

  let endingHint = '';
  if (endingPrototype) {
    const evaluation = evaluateEnding(endingPrototype, player);
    endingHint = evaluation.narrativeHint;

    if (!evaluation.isStillPossible && endingPrototype.isStillPossible) {
      for (const cond of endingPrototype.conditions) {
        if (!cond.isStillPossible) {
          endingPrototype = mutateCondition(endingPrototype, cond.id);
          break;
        }
      }
    }
  }

  // ========== 3. 世界导引师：检查世界转换 ==========

  let worldShiftSignal: WorldShiftSignal | null = null;
  if (player.progress.round % 10 === 0 || player.progress.round === 1) {
    worldShiftSignal = evaluateWorldShift(player, player.progress.sceneType);
  }

  // ========== 4. 战斗/场景切换事件（规则驱动） ==========

  let event: GameEvent | null = null;

  const transitionEvent = generateSceneTransitionEvent(player);
  if (transitionEvent) {
    event = transitionEvent;
  }

  if (!event) {
    event = generateCombatEvent(player);
  }

  // ========== 5. 剧情编织者 + 真实之眼校验 ==========

  const economicState = buildEconomicState(updatedPlayer);
  const artifactHints = buildArtifactHints(updatedPlayer);

  const narrativeContext = buildNarrativeContext(
    updatedPlayer,
    memoryState.longTermSummary,
    memoryState.shortTerm,
    endingHint,
    worldShiftSignal,
    undefined,
    economicState,
    artifactHints,
  );

  let storyOutput: StoryWeaverOutput | null = null;

  try {
    let prompt = buildStoryWeaverPrompt(narrativeContext);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const raw = await provider.generateNarrative(prompt);
        const parsed = parseStoryWeaverOutput(raw);
        const validation = validateNarrative(parsed, player, memoryState, endingPrototype ?? undefined);

        if (validation.valid) {
          storyOutput = parsed;
          break;
        }

        const errorNote = buildRetryPrompt(validation.errors);
        prompt = buildStoryWeaverPrompt(narrativeContext) + '\n' + errorNote;
      } catch (e) {
        console.warn(`StoryWeaver attempt ${attempt + 1}/3 failed:`, e);
      }
    }
  } catch (e) {
    console.warn('StoryWeaver pipeline error:', e);
  }

  if (!storyOutput) {
    console.warn('All StoryWeaver attempts failed, using fallback.');
    usedFallback = true;
    storyOutput = generateFallbackOutput(narrativeContext);
  }

  // ========== 6. NPC邂逅事件 ==========

  if (!event) {
    const npcEvent = generateNPCEvent(player);
    if (npcEvent) {
      event = npcEvent;
    }
  }

  // ========== 7. 记忆更新：记录新事件 ==========

  for (const evt of storyOutput.newEvents) {
    memoryState = addEvent(memoryState, player.progress.round, evt);
  }

  // ========== 8. 任务生成 ==========

  const context = buildContext(player);
  let newTask: Task | null = null;
  if (player.activeTasks.length < 5) {
    newTask = generateTask(context);
  }
  const newTasks: Task[] = newTask ? [newTask] : [];

  // ========== 9. 道具掉落 ==========

  const droppedItems: Item[] = [];
  if (!event) {
    const droppedItem = generateRandomItem(player.progress.sceneType, player.stats.level);
    if (droppedItem) {
      droppedItems.push(droppedItem);
    }
  }

  // ========== 10. 组装效果 ==========

  const dailyGoldBonus = player.progress.round % 7 === 0 ? 50 : 0;
  const randomGold = randomInt(0, 10);

  const effects = {
    hpChange: 0,
    mpChange: 0,
    expGain: randomInt(5, 15),
    wealthChange: randomInt(-10, 30),
    fameChange: randomInt(-2, 5),
    systemExpGain: 0,
    goldChange: dailyGoldBonus + randomGold,
  };

  // ========== 11. 成就检测 ==========

  const globalAchievements = getGlobalAchievements();
  const achievementResult = checkAllAchievements(player, globalAchievements);

  // ========== 12. 天赋触发 ==========

  let talentChoice: TurnResult['talentChoice'] | undefined;
  if (player.stats.level >= 5 && player.talents.length === 0) {
    const candidates = selectTalentChoices(
      { talent: player.attributes.talent, luck: player.attributes.luck },
      player.progress.sceneType,
      player.talents.map((t) => t.id),
      ALL_TALENTS,
    );
    if (candidates.length > 0) {
      talentChoice = { candidates };
    }
  }

  // ========== 13. 组装结果 ==========

  const sceneText = storyOutput.narrativeHook
    ? `${storyOutput.sceneDescription}\n\n${storyOutput.narrativeHook}`
    : storyOutput.sceneDescription;

  return {
    sceneText,
    event,
    choices: event ? event.choices : storyOutput.playerChoices,
    systemMessage: storyOutput.systemDialogue,
    npcInteractions: storyOutput.npcInteractions,
    newTasks,
    newAchievements: achievementResult.newAchievements.map((a) => a.id),
    achievementMessages: achievementResult.messages,
    effects,
    usedFallback,
    combatResult: null,
    completedTasks: [],
    droppedItems,
    talentChoice,
    checkInResult,
  };
};

export interface ChoiceResult {
  resultText: string;
  effects: {
    hpChange: number;
    mpChange: number;
    expGain: number;
    wealthChange: number;
    fameChange: number;
    systemExpGain: number;
    goldChange: number;
  };
  storyFlags: string[];
  combatResult: CombatResult | null;
  droppedItems: Item[];
  sceneTransition?: string;
  rewardedTalent?: Talent;
}

export const processChoice = (player: Player, choiceId: string, event: GameEvent | null): ChoiceResult => {
  // 战斗事件处理
  if (event?.type === 'combat') {
    const combat = resolveCombat(player, choiceId, event);
    let resultText = '';

    // 战斗道具掉落
    const droppedItems: Item[] = [];
    const lootItem = generateCombatLoot(player.progress.sceneType, combat.enemyLevel, combat.isVictory);
    if (lootItem) {
      droppedItems.push(lootItem);
    }

    if (combat.isEscape) {
      resultText = `你成功逃离了${combat.enemyName}的追击！`;
    } else if (combat.isVictory) {
      resultText = `你击败了等级${combat.enemyLevel}的${combat.enemyName}！获得${combat.loot.exp}经验和${combat.loot.wealth}财富。`;
      if (lootItem) resultText += ` 还获得了【${lootItem.name}】！`;
    } else {
      resultText = `你不敌等级${combat.enemyLevel}的${combat.enemyName}，身负重伤逃走了...`;
    }

    return {
      resultText,
      effects: {
        hpChange: -combat.playerDamage,
        mpChange: choiceId === 'skill' ? -10 : 0,
        expGain: combat.loot.exp,
        wealthChange: combat.loot.wealth,
        fameChange: combat.isVictory ? randomInt(1, 5) : 0,
        systemExpGain: combat.isVictory ? randomInt(2, 8) : 0,
        goldChange: combat.isVictory ? randomInt(10, 30) : 0,
      },
      storyFlags: combat.isVictory ? [`defeated_${combat.enemyName}`] : [],
      combatResult: combat,
      droppedItems,
    };
  }

  // 场景切换事件处理
  if (choiceId.startsWith('goto_')) {
    const targetScene = choiceId.replace('goto_', '');
    const scene = getSceneById(targetScene);
    return {
      resultText: `你踏入了世界通道，穿越无尽虚空，降临到了「${scene?.name || '未知世界'}」。这里的一切都与你之前所在的世界截然不同...`,
      effects: {
        hpChange: 0, mpChange: 0, expGain: Math.floor(player.stats.level * 5),
        wealthChange: 0, fameChange: 0, systemExpGain: Math.floor(player.stats.level * 2),
      },
      storyFlags: [`milestone_triggered_${player.progress.sceneLevel}`],
      combatResult: null,
      droppedItems: [],
      sceneTransition: targetScene,
    };
  }

  if (choiceId === 'stay') {
    return {
      resultText: '你决定留在当前世界继续修炼，稳固刚刚突破的境界。虽然放弃了穿越的机会，但你感受到根基更加扎实了。',
      effects: {
        hpChange: Math.floor(player.stats.maxHp * 0.2),
        mpChange: Math.floor(player.stats.maxMp * 0.2),
        expGain: Math.floor(player.stats.level * 3),
        wealthChange: 0, fameChange: 0, systemExpGain: 0,
      },
      storyFlags: [`milestone_triggered_${player.progress.sceneLevel}`],
      combatResult: null,
      droppedItems: [],
    };
  }

  // 普通事件/场景处理
  // 根据选择类型差异化结果
  const choiceTypeEffects: Record<string, { text: string; effects: Partial<ChoiceResult['effects']> }> = {
    c1: { // 谨慎行事
      text: '你谨慎地观察形势，虽然没有大收获，但也避免了不必要的风险。',
      effects: { hpChange: randomInt(0, 5), mpChange: randomInt(0, 5), expGain: randomInt(5, 15) },
    },
    c2: { // 主动出击
      text: '你主动出击把握机遇，虽然有受伤风险，但收获颇丰！',
      effects: { hpChange: randomInt(-10, 5), mpChange: randomInt(-5, 5), expGain: randomInt(15, 35), wealthChange: randomInt(0, 50) },
    },
    c3: { // 寻找盟友
      text: '你尝试寻找盟友合作共赢，结识了一些有用的人脉。',
      effects: { hpChange: 0, fameChange: randomInt(3, 10), expGain: randomInt(10, 20), wealthChange: randomInt(-10, 30) },
    },
    c4: { // 暂避锋芒
      text: '你选择暂避锋芒保存实力，虽然错过了机会，但养精蓄锐。',
      effects: { hpChange: randomInt(5, 15), mpChange: randomInt(5, 15), expGain: randomInt(3, 10) },
    },
    c5: { // 疗伤（低血量时出现）
      text: '你找到安全的地方恢复伤势，状态好转。',
      effects: { hpChange: randomInt(15, 30), mpChange: randomInt(5, 15) },
    },
    c6: { // 用财富开路
      text: '你用财富开路，虽然花费不少，但事情办得很顺利。',
      effects: { wealthChange: randomInt(-100, -30), fameChange: randomInt(5, 15), expGain: randomInt(10, 25) },
    },
    // 动态场景选项
    c_heal: {
      text: '你找到安全的地方恢复伤势，状态好转。',
      effects: { hpChange: randomInt(20, 40), mpChange: randomInt(5, 15) },
    },
    c_meditate: {
      text: '你静心冥想，灵力在体内流转，恢复了不少。',
      effects: { mpChange: randomInt(20, 40), hpChange: randomInt(5, 10) },
    },
    c_wealth: {
      text: '你用财富开路，虽然花费不少，但事情办得很顺利。',
      effects: { wealthChange: randomInt(-150, -50), fameChange: randomInt(5, 15), expGain: randomInt(15, 30) },
    },
    c_fame: {
      text: '你振臂一呼，不少人响应你的号召前来相助。',
      effects: { fameChange: randomInt(3, 8), expGain: randomInt(10, 25) },
    },
    c_advanced: {
      text: '你施展出高阶能力，局势瞬间改变！',
      effects: { expGain: randomInt(30, 60), hpChange: randomInt(-15, 0), mpChange: randomInt(-20, -5) },
    },
    c_herb: {
      text: '你仔细搜寻周围，采集到了一些有用的药材。',
      effects: { wealthChange: randomInt(20, 80), expGain: randomInt(5, 15) },
    },
    c_combat: {
      text: '你主动出击，战斗虽然激烈但你取得了胜利！',
      effects: { expGain: randomInt(25, 50), hpChange: randomInt(-20, -5), fameChange: randomInt(3, 10) },
    },
    c_explore: {
      text: '你深入探索，发现了一处隐藏的机缘！',
      effects: { expGain: randomInt(20, 45), wealthChange: randomInt(0, 100) },
    },
    c_trade: {
      text: '经过一番讨价还价，交易达成了。',
      effects: { wealthChange: randomInt(-50, 150), expGain: randomInt(5, 15) },
    },
    c_cultivate: {
      text: '你就地修炼，吸收周围灵气，修为有所精进。',
      effects: { expGain: randomInt(20, 40), mpChange: randomInt(-10, 5) },
    },
    // NPC交互选择效果
    trade: {
      text: '交易达成了！双方都满意地离开。',
      effects: { wealthChange: randomInt(-50, 100), expGain: randomInt(10, 20) },
    },
    learn: {
      text: '在对方的指导下，你领悟了新的技巧。',
      effects: { expGain: randomInt(30, 60) },
    },
    recruit: {
      text: '经过一番交涉，对方同意跟随你一起冒险！',
      effects: { fameChange: randomInt(5, 15), wealthChange: randomInt(-100, -30) },
    },
    meet: {
      text: '会面很顺利，你获得了宝贵的情报。',
      effects: { expGain: randomInt(20, 40) },
    },
    befriend: {
      text: '你结交了一个新朋友，人脉网络扩大了。',
      effects: { fameChange: randomInt(5, 10) },
    },
    join: {
      text: '你成功加入了新的组织，获得了资源支持。',
      effects: { wealthChange: randomInt(50, 150), fameChange: randomInt(5, 15) },
    },
    help: {
      text: '你的善举得到了回报，对方感激不已。',
      effects: { fameChange: randomInt(10, 20), expGain: randomInt(20, 40) },
    },
    listen: {
      text: '你认真倾听，从中获益良多。',
      effects: { expGain: randomInt(25, 50) },
    },
    cooperate: {
      text: '合作愉快！双方都能从中获益。',
      effects: { wealthChange: randomInt(30, 80), expGain: randomInt(15, 30) },
    },
    ask: {
      text: '你的提问得到了详尽的解答，眼界大开。',
      effects: { expGain: randomInt(30, 60) },
    },
    drink: {
      text: '酒过三巡，你们相谈甚欢。',
      effects: { hpChange: randomInt(-5, 10), expGain: randomInt(20, 40), fameChange: randomInt(3, 8) },
    },
    talk: {
      text: '交流很愉快，你们都获得了新的视角。',
      effects: { expGain: randomInt(20, 40) },
    },
    accept: {
      text: '你接受了提议，事情朝着好的方向发展。',
      effects: { wealthChange: randomInt(50, 100), expGain: randomInt(20, 40) },
    },
    free: {
      text: '你的善举感动了对方，他承诺日后报答。',
      effects: { fameChange: randomInt(15, 30), expGain: randomInt(30, 50) },
    },
    // 负面/风险选择
    refuse: {
      text: '你拒绝了对方，虽然安全但也错失了机会。',
      effects: { hpChange: randomInt(0, 5), expGain: randomInt(5, 10) },
    },
    decline: {
      text: '你礼貌地拒绝了，各自安好。',
      effects: { hpChange: randomInt(0, 5) },
    },
    ignore: {
      text: '你选择了无视，继续前行。',
      effects: { expGain: randomInt(5, 15) },
    },
    avoid: {
      text: '你避开了可能的麻烦，安全为上。',
      effects: { hpChange: randomInt(5, 10) },
    },
    disconnect: {
      text: '你安全地切断了连接，没有留下痕迹。',
      effects: { hpChange: randomInt(0, 5) },
    },
    // 高风险选择
    threaten: {
      text: '你的威胁起了作用，但也惹上了麻烦...',
      effects: { wealthChange: randomInt(50, 200), hpChange: randomInt(-20, 0), fameChange: randomInt(-10, 5) },
    },
    rob: {
      text: '你强行夺取了想要的东西，但这会让你的名声受损。',
      effects: { wealthChange: randomInt(100, 300), hpChange: randomInt(-15, 0), fameChange: randomInt(-15, -5) },
    },
    attack: {
      text: '战斗爆发了！你凭借实力占了上风。',
      effects: { hpChange: randomInt(-25, 0), expGain: randomInt(40, 80), fameChange: randomInt(-5, 10) },
    },
    fight: {
      text: '经过一番激战，你取得了胜利！',
      effects: { hpChange: randomInt(-30, -5), expGain: randomInt(50, 100), fameChange: randomInt(5, 15) },
    },
    challenge: {
      text: '你接受了挑战，用实力证明了自己！',
      effects: { hpChange: randomInt(-20, 0), expGain: randomInt(40, 80), fameChange: randomInt(10, 20) },
    },
    hack: {
      text: '技术对决中你略胜一筹！',
      effects: { expGain: randomInt(30, 60) },
    },
    trick: {
      text: '你的计谋成功了，获得了想要的情报。',
      effects: { expGain: randomInt(25, 50) },
    },
    kill: {
      text: '你结束了他的痛苦，但也背负了沉重的命运。',
      effects: { hpChange: randomInt(-10, 0), expGain: randomInt(60, 120), fameChange: randomInt(-10, 10) },
    },
  };

  const typeEffect = choiceTypeEffects[choiceId] || {
    text: '你的选择带来了意想不到的结果...',
    effects: {},
  };

  const luckBonus = player.attributes.luck * 0.05;
  const baseEffects = {
    hpChange: Math.floor(randomInt(-15, 10) + (luckBonus > 0.3 ? 5 : 0)),
    mpChange: Math.floor(randomInt(-10, 15)),
    expGain: Math.floor(randomInt(10, 30) * (1 + player.attributes.talent * 0.05)),
    wealthChange: Math.floor(randomInt(-50, 100) * (1 + player.attributes.family * 0.02)),
    fameChange: Math.floor(randomInt(-5, 10)),
    systemExpGain: Math.floor(randomInt(5, 15)),
  };

  // 合并特定效果和基础效果
  const effects = {
    hpChange: (typeEffect.effects.hpChange ?? baseEffects.hpChange),
    mpChange: (typeEffect.effects.mpChange ?? baseEffects.mpChange),
    expGain: (typeEffect.effects.expGain ?? baseEffects.expGain),
    wealthChange: (typeEffect.effects.wealthChange ?? baseEffects.wealthChange),
    fameChange: (typeEffect.effects.fameChange ?? baseEffects.fameChange),
    systemExpGain: baseEffects.systemExpGain,
  };

  // 处理天赋奖励
  let rewardedTalent: Talent | undefined;
  const selectedChoice = event?.choices.find((c) => c.id === choiceId);
  if (selectedChoice?.rewardTalent) {
    const talent = ALL_TALENTS.find((t) => t.id === selectedChoice.rewardTalent);
    if (talent && player.talents.length < 3 && !player.talents.some((t) => t.id === talent.id)) {
      rewardedTalent = talent;
    }
  }

  return {
    resultText: typeEffect.text,
    effects,
    storyFlags: [],
    combatResult: null,
    droppedItems: [],
    rewardedTalent,
  };
};

export const updatePlayerAfterTurn = (
  player: Player,
  turnResult: TurnResult,
  choiceResult: ChoiceResult,
  choiceId?: string
): Player => {
  let updated = { ...player };

  // 应用回合效果
  const totalEffects = {
    hpChange: turnResult.effects.hpChange + choiceResult.effects.hpChange,
    mpChange: turnResult.effects.mpChange + choiceResult.effects.mpChange,
    expGain: turnResult.effects.expGain + choiceResult.effects.expGain,
    wealthChange: turnResult.effects.wealthChange + choiceResult.effects.wealthChange,
    fameChange: turnResult.effects.fameChange + choiceResult.effects.fameChange,
    systemExpGain: turnResult.effects.systemExpGain + choiceResult.effects.systemExpGain,
    goldChange: turnResult.effects.goldChange + (choiceResult.effects.goldChange || 0),
  };

  // 更新HP/MP
  updated.stats = { ...updated.stats };
  updated.stats.hp = Math.max(0, Math.min(updated.stats.maxHp, updated.stats.hp + totalEffects.hpChange));
  updated.stats.mp = Math.max(0, Math.min(updated.stats.maxMp, updated.stats.mp + totalEffects.mpChange));

  // 更新经验
  updated.stats.exp += totalEffects.expGain;
  const newLevel = getLevelFromExp(updated.stats.exp);
  if (newLevel > updated.stats.level) {
    updated.stats.level = newLevel;
    // 升级奖励
    updated.stats.maxHp += 20;
    updated.stats.maxMp += 10;
    updated.stats.hp = updated.stats.maxHp;
    updated.stats.combatPower += 15;
  }

  // 更新财富声望金币
  updated.stats.wealth = Math.max(0, updated.stats.wealth + totalEffects.wealthChange);
  updated.stats.fame = Math.max(0, updated.stats.fame + totalEffects.fameChange);
  updated.stats.gold = Math.max(0, updated.stats.gold + totalEffects.goldChange);

  // 更新系统经验
  updated.system = { ...updated.system };
  updated.system.exp += totalEffects.systemExpGain;
  const sysDef = getSystemById(updated.system.id);
  const maxSysLevel = sysDef?.maxLevel || 10;
  const sysLevelThreshold = updated.system.level * 50;
  if (updated.system.exp >= sysLevelThreshold && updated.system.level < maxSysLevel) {
    updated.system.level += 1;
    updated.system.exp = 0;
    // 解锁新功能
    const upgrade = sysDef?.upgrades.find((u) => u.level === updated.system.level);
    if (upgrade) {
      updated.system.features = [...updated.system.features, ...upgrade.unlockedFeatures];
    }
  }

  // 更新进度
  updated.progress = { ...updated.progress };
  updated.progress.round += 1;
  updated.progress.age += 1;

  // 场景境界推进：每10级提升一个sceneLevel
  const newSceneLevel = Math.floor(updated.stats.level / 10) + 1;
  if (newSceneLevel > updated.progress.sceneLevel) {
    updated.progress.sceneLevel = newSceneLevel;
    // 境界突破奖励
    updated.stats.maxHp += 30;
    updated.stats.maxMp += 15;
    updated.stats.hp = updated.stats.maxHp;
    updated.stats.combatPower += 25;
  }

  // 处理场景切换
  if (choiceResult.sceneTransition) {
    updated.progress.sceneType = choiceResult.sceneTransition as any;
    updated.progress.sceneLevel = 1;
    // 场景切换奖励
    updated.stats.exp += Math.floor(updated.stats.level * 10);
  }

  // 添加故事标记
  if (choiceResult.storyFlags.length > 0) {
    updated.progress.storyFlags = [...updated.progress.storyFlags, ...choiceResult.storyFlags];
  }

  // 添加掉落的道具到背包
  const allDroppedItems = [...turnResult.droppedItems, ...choiceResult.droppedItems];
  if (allDroppedItems.length > 0) {
    updated.inventory = [...updated.inventory, ...allDroppedItems];
  }

  // 添加任务
  if (turnResult.newTasks.length > 0) {
    updated.activeTasks = [...updated.activeTasks, ...turnResult.newTasks];
  }

  // 推进任务进度并完成（按实际目标类型检查）
  const completedTasks: Task[] = [];
  updated.activeTasks = updated.activeTasks.map((task) => {
    if (task.completed) return task;

    let shouldProgress = false;

    switch (task.targetType) {
      case 'survive':
      case 'explore':
        // 每回合自然推进
        shouldProgress = true;
        break;
      case 'combat':
        // 战斗胜利才算
        shouldProgress = choiceResult.combatResult?.isVictory || false;
        break;
      case 'wealth':
        // 财富达到目标值
        shouldProgress = updated.stats.wealth >= task.targetValue;
        break;
      case 'level':
        // 等级达到目标值
        shouldProgress = updated.stats.level >= task.targetValue;
        break;
      case 'social':
        // 社交类选择才算
        shouldProgress = !!choiceId && [
          'trade', 'learn', 'recruit', 'meet', 'befriend', 'cooperate',
          'talk', 'drink', 'exchange', 'join', 'help', 'ask', 'listen',
          'accept', 'free', 'comfort', 'buy'
        ].includes(choiceId);
        break;
    }

    if (shouldProgress) {
      const newProgress = task.progress + 1;
      if (newProgress >= task.targetRounds) {
        completedTasks.push({ ...task, progress: newProgress, completed: true });
        return { ...task, progress: newProgress, completed: true };
      }
      return { ...task, progress: newProgress };
    }
    return task;
  });

  // 完成任务给奖励
  for (const task of completedTasks) {
    updated.stats.exp += task.reward.exp || 0;
    updated.stats.wealth += task.reward.wealth || 0;
    updated.system.exp += task.reward.systemExp || 0;
    updated.completedTasks = [...updated.completedTasks, task.id];
  }

  // 添加成就
  if (turnResult.newAchievements.length > 0) {
    const globalAchievements = getGlobalAchievements();
    const newGlobal = [...globalAchievements];
    
    for (const achId of turnResult.newAchievements) {
      if (!updated.achievements.includes(achId)) {
        updated.achievements = [...updated.achievements, achId];
      }
      if (!newGlobal.includes(achId)) {
        newGlobal.push(achId);
      }
    }
    
    saveGlobalAchievements(newGlobal);
  }

  // 添加历史
  updated.history = [...updated.history, {
    round: player.progress.round,
    age: player.progress.age,
    description: turnResult.sceneText.substring(0, 100),
    type: 'scene',
  }];

  // 保存访问过的场景
  const visited = getVisitedScenes();
  if (!visited.includes(player.progress.sceneType)) {
    saveVisitedScenes([...visited, player.progress.sceneType]);
  }

  // 自动存档
  savePlayer(updated);

  return updated;
};

export const checkGameOver = (player: Player): { isOver: boolean; reason: string; ending: string } | null => {
  const scene = getSceneById(player.progress.sceneType);
  const maxAge = scene?.maxAge || GAME_CONFIG.maxAgeBase;

  if (player.stats.hp <= 0) {
    return {
      isOver: true,
      reason: '战斗死亡',
      ending: '你在激烈的战斗中耗尽了最后一丝生命力。虽然生命终结，但你的传说将在后世流传...',
    };
  }

  if (player.progress.age >= maxAge) {
    return {
      isOver: true,
      reason: '寿终正寝',
      ending: `你走过了${player.progress.age}年的人生旅程，最终归于尘土。这是属于${player.name}的故事，一个${scene?.name || '未知世界'}中的传奇。`,
    };
  }

  if (player.stats.level >= 100) {
    return {
      isOver: true,
      reason: '突破极限',
      ending: '你突破了世界的极限，踏入了传说的境界。无数生灵仰望你的背影，而你的传说将永世流传！',
    };
  }

  return null;
};
