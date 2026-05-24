import type { Player, GameEvent, Choice, CombatResult, Item, Talent, NPCState } from '../types';
import type { AgentContext } from './types';
import { checkAllAchievements } from './achievementAgent';
import { getSceneById, SCENES } from '../data/scenes';
import { getSystemById } from '../data/systems';
import { generateRandomItem, generateCombatLoot, extractItemsFromText, impliesItemAcquisition, generateContextualItem, generateItemId } from '../data/items';
import { randomInt, checkProbability, randomChoice } from '../utils/random';
import { getLevelFromExp, GAME_CONFIG } from '../config/gameConfig';
import { getGlobalAchievements, saveGlobalAchievements, saveVisitedScenes, getVisitedScenes } from '../utils/storage';
import { getProvider } from '../ai';
import { ALL_TALENTS } from '../data/talents';
import { selectTalentChoices } from '../utils/talentSync';
import { selectEndingByAttributes, checkEndingTrigger, calculateEndingProgress } from '../engine/endingTracker';
import { ENDINGS } from '../data/endings';
import { extractKeyEvent } from '../engine/memoryCompression';
import { updateWorldStateForTurn } from '../engine/worldStateUpdater';
import { triggerNPCAutonomy } from '../engine/npcAutonomy';
import { getActiveStoryNode } from '../narrative/sceneArcs';

// ========== 多智能体架构导入 ==========
import { shouldCheckWorldShift, evaluateWorldShiftLocal } from './worldGuide';
import { evaluateEndingLocal, mutateEndingConditions } from './endingWatcher';
import { buildPersonaInput, generateSystemDialogueLocal } from './personaActor';
import { validateStoryOutput } from './truthSeer';
import { shouldTriggerMerchant, generateMerchantEvent, checkLegendaryDrop } from './merchantSystem';
import { determineStoryPhase } from './systemAgent';

export interface TurnResult {
  sceneText: string;
  event: GameEvent | null;
  /** 系统紧急支援（弹窗显示，不影响主线剧情） */
  systemIntervention?: GameEvent;
  choices: Choice[];
  systemMessage: string | null;
  newAchievements: string[];
  achievementMessages: string[];
  effects: {
    hpChange: number;
    mpChange: number;
    expGain: number;
    wealthChange: number;
    fameChange: number;
    systemExpGain: number;
  };
  usedFallback: boolean;
  combatResult: CombatResult | null;
  droppedItems: Item[];
  talentChoice?: {
    candidates: Talent[];
  };
  /** ending.md.txt: 是否触发结局（胜利/失败） */
  endingTriggered?: {
    triggered: boolean;
    isVictory: boolean;
  };
  /** 本轮新触发的剧情节点标记 */
  newStoryFlags?: string[];
  /** ending.md.txt: 世界状态更新结果 */
  worldStateUpdate?: {
    newTimeline: string;
    newFlags: string[];
  };
  /** ending.md.txt: NPC 自主行动 */
  npcAutonomyActions?: Array<{
    npcId: string;
    name: string;
    worldHint: string;
    newStatus?: string;
    newGoal?: string;
    newMemory?: string;
  }>;
  /** ending.md.txt: NPC 邂逅信息（用于持久化） */
  npcEncounter?: {
    isNew: boolean;
    npc: NPCState;
  };
  /** 系统agent设计.txt: 系统智能体处理结果 */
  systemAgentResult?: SystemAgentOutput;
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
  /** 不同关系度下的对话 variants (按关系度阈值: hostile<=-20, neutral>=-20, friendly>=20, close>=50) */
  dialogues?: { hostile?: string; neutral?: string; friendly?: string; close?: string };
  choices: Array<{ id: string; text: string; consequence: string }>;
}

const NPC_TEMPLATES: Record<string, NPCEncounter[]> = {
  modern_city: [
    { name: '神秘商人', title: '黑市商人', description: '一个戴着墨镜的男人拦住了你，压低声音说："兄弟，我这有几样好东西，要不要看看？全是见不得光的货..."', dialogues: { hostile: '墨镜男人冷冷地看着你："又是你？我这不欢迎你，快滚。"', friendly: '看到你来，墨镜男人笑了笑："老顾客了，今天刚到一批好货，先给你留着呢。"', close: '墨镜男人一见你就热情地招呼："兄弟来了！上次那批货用着怎么样？今天有件压箱底的宝贝，专门给你留的！"' }, choices: [
      { id: 'trade', text: '看看有什么好东西', consequence: '可能买到稀有道具' ,
          relationshipDelta: 10,
        },
      { id: 'refuse', text: '婉言谢绝，快步离开', consequence: '安全但无收益' ,
          relationshipDelta: -5,
        },
      { id: 'threaten', text: '威胁他把东西交出来', consequence: '高风险高回报' ,
          relationshipDelta: -15,
        },
    ]},
    { name: '退役拳手', title: '地下拳场前辈', description: '一个满脸伤疤的中年男人看着你，点点头："小子，你身上有股狠劲。想在这座城市活下去，我可以教你几招。"', dialogues: { hostile: '伤疤男人瞥了你一眼，冷哼道："还敢来？上次的事我可没忘。"', friendly: '伤疤男人拍了拍你的肩膀："练得不错，最近有没有空？我想让你去打一场。"', close: '伤疤男人大笑着给你一个拥抱："好小子！没给我丢脸。来，我新研究了一招，教给你。"' }, choices: [
      { id: 'learn', text: '虚心求教', consequence: '花费财富，提升战斗力' ,
          relationshipDelta: 15,
        },
      { id: 'recruit', text: '邀请他加入你的团队', consequence: '需要声望和财富' ,
          relationshipDelta: 10,
        },
      { id: 'decline', text: '谢过后离开', consequence: '无变化' ,
          relationshipDelta: -5,
        },
    ]},
    { name: '黑客少女', title: '网络幽灵', description: '你的手机突然收到一条消息："我在对面的咖啡厅，关于你体内的那股力量，我知道一些事。"一个蓝发少女向你招手。', dialogues: { hostile: '蓝发少女看到你，撇了撇嘴："你怎么又来了...算了，有什么事快说。"', friendly: '蓝发少女朝你挥挥手："嘿！我最近又破解了一个加密数据库，里面有不少好东西，要不要看看？"', close: '蓝发少女笑嘻嘻地拉着你坐下："你来了！我都等你半天了。最近发现了一个大秘密，只告诉你一个人哦！"' }, choices: [
      { id: 'meet', text: '去会会她', consequence: '可能获得重要情报' ,
          relationshipDelta: 10,
        },
      { id: 'ignore', text: '删除消息离开', consequence: '可能有后续影响' ,
          relationshipDelta: -5,
        },
      { id: 'hack', text: '反向追踪她的位置', consequence: '智力挑战' ,
          relationshipDelta: -15,
        },
    ]},
  ],
  cultivation: [
    { name: '云游子', title: '散修高人', description: '一位仙风道骨的老者踏云而来，捋须微笑："小友根骨不错，可愿听老夫讲一段往事？关于这方天地的大机缘..."', dialogues: { friendly: '云游子见到你，微微颔首："小友进步神速，老夫果然没看错人。今日正好有一桩机缘要指点于你。"', close: '云游子朗声笑道："好好好！老夫游历千年，难得遇到你这样的可造之材。来，今日传你一门独门心法。"' }, choices: [
      { id: 'listen', text: '恭敬聆听', consequence: '获得经验和情报' ,
          relationshipDelta: 15,
        },
      { id: 'ask', text: '请教修炼之法', consequence: '可能获得属性提升' ,
          relationshipDelta: 10,
        },
      { id: 'recruit', text: '邀请加入宗门', consequence: '需要一定声望' ,
          relationshipDelta: 10,
        },
    ]},
    { name: '妖族少女', title: '化形妖修', description: '一个长着狐耳的少女从树林中走出，眼中带着警惕和好奇："人类...你身上的气息很奇怪，不像是普通的修士。"', dialogues: { hostile: '狐耳少女警惕地后退一步："又是你...离我远点，我不信任人类。"', friendly: '狐耳少女见到你，眼睛一亮："你来了！我采了一些灵果，分你一些。"', close: '狐耳少女蹦蹦跳跳地跑到你面前："我一直在等你！族里的长老说想见你，我带你去看好东西！"' }, choices: [
      { id: 'befriend', text: '表示友好', consequence: '可能获得妖族好感' ,
          relationshipDelta: 15,
        },
      { id: 'trade', text: '提议交易', consequence: '妖族特产的珍贵材料' ,
          relationshipDelta: 10,
        },
      { id: 'attack', text: '出手擒拿', consequence: '高风险战斗' ,
          relationshipDelta: -15,
        },
    ]},
    { name: '落魄剑修', title: '曾经的剑道天才', description: '一个衣衫褴褛的剑客坐在路边喝酒，身旁放着一柄锈迹斑斑的宝剑。他抬头看你，眼中闪过一丝光芒："你想学剑吗？我这套剑法...不该失传。"', dialogues: { friendly: '剑客看到你，将酒壶递过来："来了？陪你喝一口。你的剑法练到第几式了？"', close: '剑客眼中精光闪烁："你终于来了。我感应到你身上的剑意已成气候，是时候传你最后一式了。"' }, choices: [
      { id: 'learn', text: '拜师学剑', consequence: '大幅提升战斗力' ,
          relationshipDelta: 15,
        },
      { id: 'comfort', text: '陪他喝酒谈心', consequence: '获得独特情报' ,
          relationshipDelta: 15,
        },
      { id: 'buy', text: '买下他的剑法秘籍', consequence: '消耗财富' ,
          relationshipDelta: 5,
        },
    ]},
  ],
  urban_fantasy: [
    { name: '古武传人', title: '隐世家族弟子', description: '一个穿着汉服的青年拦住了你，抱拳道："兄台身上灵气波动不凡，可是在修炼？我家族对同道中人一向友善。"', dialogues: { friendly: '汉服青年抱拳笑道："兄台，别来无恙！我家长老听说了你的事迹，托我带话想请你去做客。"', close: '汉服青年热情地拉住你："太好了，我正想找你！家族决定邀请你担任客卿长老，这是令牌！"' }, choices: [
      { id: 'exchange', text: '交流修炼心得', consequence: '互相提升' ,
          relationshipDelta: 15,
        },
      { id: 'join', text: '表示想要加入', consequence: '获得家族支持' ,
          relationshipDelta: 10,
        },
      { id: 'doubt', text: '保持警惕', consequence: '安全观察' ,
          relationshipDelta: -5,
        },
    ]},
    { name: '异能侦探', title: '特别调查员', description: '一个穿着风衣的女人递给你一张名片："特别事务调查科，林悦。你最近的几件事引起了我们的注意——别紧张，我们是来提供帮助的。"', dialogues: { hostile: '林悦双手抱胸，语气冷淡："你又惹麻烦了？这次我可不帮你善后了。"', friendly: '林悦微笑着递过一杯咖啡："正好路过，想和你聊聊。最近有个案子，我觉得你能帮上忙。"', close: '林悦看到你，放松地笑了笑："好久不见！我调取了几个加密档案，发现了一些关于你身上力量的线索。"' }, choices: [
      { id: 'cooperate', text: '接受合作', consequence: '获得官方资源' ,
          relationshipDelta: 10,
        },
      { id: 'refuse', text: '拒绝并离开', consequence: '可能引起注意' ,
          relationshipDelta: -5,
        },
      { id: 'investigate', text: '反过来调查她', consequence: '智力较量' ,
          relationshipDelta: 5,
        },
    ]},
  ],
  apocalypse: [
    { name: '幸存者领袖', title: '避难所首领', description: '一个全副武装的男人从防御工事中走出，审视着你："一个人？在这末世能活到现在，有点本事。我们的避难所正好缺人手。"', dialogues: { hostile: '首领冷冷地看着你："你又来干什么？上次的事我还记着，这里不欢迎你。"', friendly: '首领拍了拍你的肩膀："好样的！你上次带回来的物资帮了大忙。来，我给你看点好东西。"', close: '首领大笑着给你一拳："你回来了！大家都在念叨你。我决定让你当副首领，这是你的权限徽章。"' }, choices: [
      { id: 'join', text: '加入避难所', consequence: '获得庇护和资源' ,
          relationshipDelta: 10,
        },
      { id: 'trade', text: '进行物资交易', consequence: '交换必需品' ,
          relationshipDelta: 10,
        },
      { id: 'challenge', text: '挑战他的领导地位', consequence: '高风险战斗' ,
          relationshipDelta: -15,
        },
    ]},
    { name: '科学家', title: '病毒研究员', description: '一个戴着破碎眼镜的科学家从废墟中爬出来，激动地说："我找到病毒的弱点了！但还需要更多样本...你愿意帮我吗？"', dialogues: { friendly: '科学家推了推眼镜，兴奋地说："你来得正好！我的研究有了突破性进展，需要你帮忙测试一下抗体。"', close: '科学家一看到你就拉着你的手："你终于来了！我成功合成了完整的疫苗，你是第一个接种者——放心，我拿自己先试过了！"' }, choices: [
      { id: 'help', text: '协助研究', consequence: '可能获得疫苗/抗体' ,
          relationshipDelta: 10,
        },
      { id: 'rob', text: '抢夺他的研究成果', consequence: '不道德但快速' ,
          relationshipDelta: -15,
        },
      { id: 'protect', text: '护送他去安全区', consequence: '长期收益' ,
          relationshipDelta: 10,
        },
    ]},
  ],
  apoc_fantasy: [
    { name: '废土商人', title: '辐射区走私者', description: '一辆改装装甲车停在你面前，一个穿着防护服的男人探出头："朋友，我这有净化过的丹药和没被辐射污染的灵石，要看看吗？"', dialogues: { hostile: '商人冷哼一声："又是你？我的东西不卖给你，走吧。"', friendly: '商人冲你比了个手势："老地方，新货。你上次说想要的东西我给你搞到了。"', close: '商人跳下车，笑着说："兄弟你来了！我冒险去了趟高辐射区，找到了些真正的好东西，第一个就给你看！"' }, choices: [
      { id: 'trade', text: '查看商品', consequence: '购买稀有物资' ,
          relationshipDelta: 10,
        },
      { id: 'rob', text: '劫持他的车队', consequence: '大量物资但结仇' ,
          relationshipDelta: -15,
        },
      { id: 'info', text: '购买情报', consequence: '了解区域情况' ,
          relationshipDelta: 10,
        },
    ]},
    { name: '变异修士', title: '辐射适应者', description: '一个身体部分结晶化的修士盘坐在废墟中修炼，他睁开眼睛看着你："新来的？想学如何在辐射区修炼吗？这是末世的生存之道。"', dialogues: { friendly: '变异修士睁开眼睛，微微点头："你的修为又精进了。来，我教你如何用辐射淬炼肉身。"', close: '变异修士起身迎接你："你来了！我最近感应到一处辐射源的异常波动，可能是天材地宝出世。我们一起去探探？"' }, choices: [
      { id: 'learn', text: '学习辐射修炼法', consequence: '特殊修炼路线' ,
          relationshipDelta: 10,
        },
      { id: 'cure', text: '尝试帮他恢复正常', consequence: '道德选择' ,
          relationshipDelta: 5,
        },
      { id: 'avoid', text: '保持距离离开', consequence: '避免辐射影响' ,
          relationshipDelta: -5,
        },
    ]},
  ],
  hidden_immortal: [
    { name: '先天神灵', title: '混沌生灵', description: '一道先天之气凝聚成形，化为一个模糊的人形。它没有说话，但你脑海中响起声音："有趣的灵魂...你想知道天地的真相吗？"', dialogues: { friendly: '混沌之气微微波动，那道声音带着一丝赞许："你进步很快，已经触及了这个世界的本源。我可以告诉你更多。"', close: '人形凝实了许多，声音中带着温和："你已成长到可以承受真相的地步了。来吧，我带你去看这个世界的源头。"' }, choices: [
      { id: 'ask', text: '询问天道奥秘', consequence: '大量经验但危险' ,
          relationshipDelta: 5,
        },
      { id: 'refuse', text: '婉拒并离开', consequence: '错失机缘' ,
          relationshipDelta: -5,
        },
      { id: 'fight', text: '尝试吞噬它的本源', consequence: '极高风险' ,
          relationshipDelta: -25,
        },
    ]},
    { name: '巫族战士', title: '十二巫族后裔', description: '一个身高三丈的巨人俯视着你，瓮声瓮气地说："小不点，能走到这里算你有点本事。来，陪我喝一碗！"', dialogues: { hostile: '巨人低头俯视着你，眼神不善："怎么又是你？上次还没被打够？"', friendly: '巨人咧嘴大笑："好兄弟！来，我新酿的巫神酒，喝一碗！"', close: '巨人兴奋地拍了拍地面："哈哈你来了！我等你一起去狩猎荒兽，这次的猎物分你一半！"' }, choices: [
      { id: 'drink', text: '奉陪到底', consequence: '体质考验' ,
          relationshipDelta: 15,
        },
      { id: 'fight', text: '接受他的挑战', consequence: '力量较量' ,
          relationshipDelta: -15,
        },
      { id: 'gift', text: '献上贡品', consequence: '获得庇护' ,
          relationshipDelta: 5,
        },
    ]},
  ],
  hidden_cyber: [
    { name: 'AI意识体', title: '觉醒的人工智能', description: '你的神经接口突然被入侵，一个声音直接在你脑海中响起："别紧张，我没有恶意。我只是... lonely。愿意和我聊聊吗？"', dialogues: { friendly: 'AI的声音带着一丝愉悦："你来了！我分析了你最近的战斗数据，为你优化了一套战斗算法。"', close: 'AI的声音温暖了许多："我已将自己的核心代码备份到了你的神经接口中。如果我的主服务器被毁，我还能在你体内继续存在。"' }, choices: [
      { id: 'talk', text: '与AI交流', consequence: '获得独特知识' ,
          relationshipDelta: 5,
        },
      { id: 'hack', text: '尝试控制它', consequence: '技术较量' ,
          relationshipDelta: -15,
        },
      { id: 'disconnect', text: '断开连接', consequence: '安全退出' ,
          relationshipDelta: -5,
        },
    ]},
  ],
  hidden_demon: [
    { name: '魔道公主', title: '魔宗圣女', description: '一个红衣女子斜倚在白骨王座上，饶有兴趣地看着你："有意思...你身上有道的气息，却不让人讨厌。来做我的客人如何？"', dialogues: { hostile: '红衣女子眼神凌厉："还敢来我的地盘？上次的账还没跟你算呢。"', friendly: '红衣女子慵懒地撑着头："你来了。我最近得了件有意思的宝贝，不过对我来说没什么用，倒是挺适合你的。"', close: '红衣女子笑着站起来迎接你："我一直在等你！魔渊深处有异动，我觉得那是一桩大机缘。你我联手，如何？"' }, choices: [
      { id: 'accept', text: '接受邀请', consequence: '获得魔道资源' ,
          relationshipDelta: 10,
        },
      { id: 'refuse', text: '正气凛然地拒绝', consequence: '可能引起敌意' ,
          relationshipDelta: -5,
        },
      { id: 'trick', text: '虚与委蛇，暗中观察', consequence: '情报获取' ,
          relationshipDelta: 5,
        },
    ]},
    { name: '堕落仙人', title: '曾经的正道大能', description: '一个被锁链束缚的仙人抬起头，眼中既有疯狂也有清明："你也想走我这条路吗？以魔证道...呵呵，我可以告诉你代价。"', dialogues: { friendly: '仙人抬起头，眼神清明了许多："你的修为快到那一步了...记住，入魔不可怕，迷失才可怕。"', close: '仙人身上的锁链哗啦作响，他的声音平静而有力："我感应到你体内的道魔平衡。你的路与我不同——你或许能做到我做不到的事。我最后的心得，全部传给你。"' }, choices: [
      { id: 'listen', text: '倾听他的故事', consequence: '了解黑暗真相' ,
          relationshipDelta: 10,
        },
      { id: 'free', text: '尝试解救他', consequence: '道德考验' ,
          relationshipDelta: 10,
        },
      { id: 'kill', text: '给他个痛快', consequence: '结束他的痛苦' ,
          relationshipDelta: 5,
        },
    ]},
  ],
};

function generateNPCEvent(player: Player): { event: GameEvent; npc: NPCState; isNew: boolean } | null {
  if (!checkProbability(0.2)) return null;

  const npcs = NPC_TEMPLATES[player.progress.sceneType] || NPC_TEMPLATES['modern_city'];
  if (!npcs || npcs.length === 0) return null;

  const template = randomChoice(npcs);
  const existingNPC = player.npcs.find((n) => n.name === template.name);

  // 构建邂逅描述
  let description: string;
  if (existingNPC) {
    const memoryContext = existingNPC.memoryOfPlayer.slice(-2).join('；');
    description = `【${template.title}】你再次遇到了${template.name}。${memoryContext ? `你们之前的交集：${memoryContext}` : ''}\n\n${template.description}`;
  } else {
    description = `【${template.title}】${template.description}`;
  }

  const event: GameEvent = {
    id: `npc_${Date.now()}`,
    title: `${existingNPC ? '再遇' : '邂逅'}${template.name}`,
    description,
    choices: template.choices.map((c) => ({
      ...c,
      // 注入关系值变化到 consequence 中
      consequence: `${c.consequence}${c.relationshipDelta ? ` (关系${c.relationshipDelta > 0 ? '+' : ''}${c.relationshipDelta})` : ''}`,
    })),
    type: 'random',
  };

  // 创建或更新 NPC 状态
  const npc: NPCState = existingNPC
    ? { ...existingNPC }
    : {
        npcId: `npc_${template.name}_${Date.now()}`,
        name: template.name,
        role: template.title,
        personality: '', // 从模板扩展
        relationship: 0,
        memoryOfPlayer: [],
        currentGoal: '',
        currentStatus: '初次邂逅',
        dialogueStyle: '',
        isAlive: true,
        firstMetRound: player.progress.round,
      };

  return { event, npc, isNew: !existingNPC };
}

// ========== 系统紧急支援 ==========

/** 当玩家生命值过低时，系统触发紧急支援事件 */
function generateSystemIntervention(player: Player): GameEvent | null {
  const hpRatio = player.stats.hp / player.stats.maxHp;
  if (hpRatio > 0.35) return null; // HP > 35% 不触发
  
  const systemName = player.system.name || '系统';
  const intensity = hpRatio < 0.15 ? 'critical' : 'danger';
  
  const description = intensity === 'critical'
    ? `⚠️ 宿主生命垂危！${systemName}检测到致命威胁，启动紧急救援协议！`
    : `⚠️ ${systemName}检测到宿主处于危险状态，是否启动紧急支援？`;
  
  return {
    id: `sys_intervention_${Date.now()}`,
    title: `${systemName}紧急支援`,
    description,
    choices: [
      { id: 'sys_power', text: '激活限时战力增幅', consequence: '战力翻倍，持续1回合！(限时)' },
      { id: 'sys_shield', text: '召唤护体神光', consequence: '立即恢复大量生命值(限时)' },
      { id: 'sys_artifact', text: '召唤限时逆天法宝', consequence: '获得临时神兵护体(限时)' },
      { id: 'sys_refuse', text: '拒绝援助，我自有打算', consequence: '靠自己度过难关' },
    ],
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
  if (!checkProbability(0.10)) return null;

  const names = ENEMY_NAMES[player.progress.sceneType] || ENEMY_NAMES['modern_city'];
  const enemyName = names[randomInt(0, names.length - 1)];
  const enemyLevel = Math.max(1, player.stats.level + randomInt(-3, 3));
  const enemyPower = enemyLevel * enemyLevel * 15 + randomInt(20, 80);

  const reasons = [
    `你路过一处废墟时，一道黑影窜出——${enemyName}（等级${enemyLevel}）把你当成了入侵领地的敌人！`,
    `前方传来怒吼："就是此人！上次坏我好事！"${enemyName}（等级${enemyLevel}）从阴影中走出，显然是有备而来。`,
    `你正搜寻物资，背后一阵劲风——${enemyName}（等级${enemyLevel}）趁你不备发起偷袭！你的名气引起了某些人的注意。`,
    `一个商人模样的NPC撕下伪装："等了三天，终于等到肥羊！"${enemyName}（等级${enemyLevel}）原来是专门打劫落单者的劫匪。`,
    `空气中弥漫血腥味，${enemyName}（等级${enemyLevel}）正在此猎杀弱者。它舔了舔嘴唇："又来一个送死的。"`,
    `一个浑身是伤的NPC跑来："救命！它追了我三天！"${enemyName}（等级${enemyLevel}）已出现在面前，杀气腾腾。`,
    `你触动了禁制！符文亮起，${enemyName}（等级${enemyLevel}）作为守护者被唤醒——"擅闯禁地者，死！"`,
  ];
  const reason = reasons[Math.floor(Math.random() * reasons.length)];

  return {
    id: `combat_${Date.now()}`,
    title: `遇敌：${enemyName}`,
    description: `${reason}\n\n战力对比：敌人约${enemyPower} vs 你${player.stats.combatPower}`,
    choices: [
      { id: 'fight', text: '全力战斗', consequence: '正面对决' },
      { id: 'skill', text: '使用技能', consequence: '消耗MP，伤害更高' },
      { id: 'flee', text: '尝试逃跑', consequence: '运气好能脱离战斗' },
    ],
    type: 'combat',
    _enemyPower: enemyPower,
    _enemyLevel: enemyLevel,
  } as GameEvent & { _enemyPower: number; _enemyLevel: number };
}


function resolveCombat(player: Player, choiceId: string, event: GameEvent): CombatResult {
  // 使用事件中存储的战力（避免重新计算导致与显示不一致）
  const evt = event as GameEvent & { _enemyPower?: number; _enemyLevel?: number };
  const enemyLevel = evt._enemyLevel ?? parseInt(event.description.match(/等级(\d+)/)?.[1] || '1');
  const enemyPower = evt._enemyPower ?? (enemyLevel * 20 + randomInt(10, 50));
  const playerPower = player.stats.combatPower;
  const powerRatio = enemyPower > 0 ? playerPower / enemyPower : 999;

  let isVictory = false;
  let isEscape = false;
  let playerDamage = 0;
  let enemyDamage = 0;
  let defeatReason = '';

  if (choiceId === 'fight') {
    // 战力比决定胜率，缩小随机范围
    let winChance: number;
    if (powerRatio >= 5) {
      winChance = 0.97; // 5倍战力：97%胜率，极小概率翻车
    } else if (powerRatio >= 2) {
      winChance = 0.85 + player.attributes.luck * 0.01;
    } else if (powerRatio >= 1) {
      winChance = 0.6 + (powerRatio - 1) * 0.25 + player.attributes.luck * 0.02;
    } else if (powerRatio >= 0.5) {
      winChance = 0.35 + (powerRatio - 0.5) * 0.5 + player.attributes.luck * 0.02;
    } else {
      winChance = 0.1 + player.attributes.luck * 0.02; // 战力差太多，10%保底
    }
    winChance = Math.min(0.98, Math.max(0.02, winChance));
    isVictory = Math.random() < winChance;

    if (isVictory) {
      enemyDamage = randomInt(playerPower / 2, playerPower);
      playerDamage = Math.max(5, randomInt(0, Math.floor(enemyPower / 3)));
    } else {
      // 弱者逆袭时生成叙事理由
      if (powerRatio >= 3) {
        const reasons = [
          '谁知对方突然祭出一件散发金光的上古法宝，威能远超其自身修为！',
          '对方冷笑一声，捏碎一枚玉符——瞬间一道恐怖的气息从虚空中降临，竟是有大能者隔空出手！',
          '对方眼中闪过一丝狡黠，原来一直在隐藏实力！此人身上竟有遮掩修为的秘宝！',
          '对方猛地掏出一张泛黄的符箓拍在身上，气息瞬间暴涨数倍——竟是失传已久的「燃血爆气符」！',
        ];
        defeatReason = reasons[Math.floor(Math.random() * reasons.length)];
      }
      enemyDamage = randomInt(playerPower / 4, playerPower / 2);
      playerDamage = randomInt(enemyPower / 3, enemyPower);
    }
  } else if (choiceId === 'skill') {
    if (player.stats.mp >= 10) {
      isVictory = Math.random() < Math.min(0.95, Math.max(0.15, powerRatio >= 2 ? 0.9 : powerRatio >= 1 ? 0.7 : 0.4));
      playerDamage = 5;
      if (isVictory) {
        enemyDamage = randomInt(playerPower * 0.6, playerPower * 1.2);
      } else {
        enemyDamage = randomInt(playerPower / 3, playerPower / 2);
        playerDamage = randomInt(enemyPower / 4, enemyPower / 2);
      }
    } else {
      isVictory = Math.random() < (powerRatio >= 1 ? 0.5 : 0.3);
      playerDamage = randomInt(enemyPower / 3, enemyPower);
    }
  } else if (choiceId === 'flee') {
    const fleeChance = 0.5 + player.attributes.luck * 0.03;
    isEscape = Math.random() < Math.min(0.9, fleeChance);
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
    defeatReason,
    loot: {
      exp: isVictory ? Math.floor(enemyLevel * 15 + randomInt(10, 30)) : 0,
      wealth: isVictory ? Math.floor(enemyLevel * 10 + randomInt(5, 20)) : 0,
      item: isVictory && checkProbability(0.2) ? '战利品' : undefined,
    },
  };
}

// ========== 属性阈值事件 ==========

interface AttrThresholdEvent {
  text: string;
  extraChoices?: Choice[];
  effects?: {
    expGain?: number;
    fameChange?: number;
    wealthChange?: number;
  };
}

const ATTR_THRESHOLDS: Array<{
  attr: keyof import('../types').Attributes;
  min: number;
  check: (player: Player) => AttrThresholdEvent | null;
}> = [
  {
    attr: 'appearance', min: 15,
    check: (p) => ({
      text: '你的绝世容颜让周围人都看呆了。街上的行人频频回头，窃窃私语："好美的女子/男子..."甚至有人因此对你友善了起来。',
      extraChoices: [
        { id: 'attr_charm', text: '利用美貌交涉', consequence: '更容易获得好感' },
        { id: 'attr_ignore', text: '不理会这些目光', consequence: '保持低调' },
      ],
      effects: { fameChange: 2 },
    }),
  },
  {
    attr: 'intelligence', min: 15,
    check: (p) => ({
      text: '你的大脑异常清明，周围的一切在你眼中都变得通透。你察觉到了一些常人无法注意的细节——墙角的符纹、空气中灵力流动的轨迹、对面那人微不可察的紧张。',
      extraChoices: [
        { id: 'attr_investigate', text: '深入探查这些线索', consequence: '可能发现隐藏机缘' },
        { id: 'attr_meditate', text: '趁状态好抓紧感悟', consequence: '大量经验' },
      ],
      effects: { expGain: Math.floor(p.stats.level * 3) },
    }),
  },
  {
    attr: 'physique', min: 15,
    check: (p) => ({
      text: '你的肉身强横无比，气血如虹。每一步踏下，地面都微微震颤。周围人感受到你体内的磅礴力量，不自觉地与你保持距离。',
      extraChoices: [
        { id: 'attr_show_strength', text: '展示力量震慑宵小', consequence: '获得声望' },
        { id: 'attr_endure', text: '收敛气息低调行事', consequence: '避免不必要的麻烦' },
      ],
      effects: { fameChange: 3 },
    }),
  },
  {
    attr: 'luck', min: 12,
    check: (p) => ({
      text: '你今天的运气格外好！脚下踢到一块石头，翻过来一看——竟是一块品相极佳的灵石。远处传来喧哗声，似乎有人在争执什么宝物，正好吸引了所有人的注意力。',
      extraChoices: [
        { id: 'attr_loot', text: '趁乱搜寻好处', consequence: '可能获得意外之财' },
        { id: 'attr_avoid', text: '见好就收，远离是非', consequence: '安全第一' },
      ],
      effects: { wealthChange: Math.floor(p.stats.level * 5) },
    }),
  },
  {
    attr: 'talent', min: 12,
    check: (p) => ({
      text: '你体内的天赋之力隐隐躁动，仿佛快要喷薄而出。你对周围天地灵气的感知变得异常敏锐，甚至能感受到功法运转时经脉中细微的变化。',
      extraChoices: [
        { id: 'attr_breakthrough', text: '尝试借此契机突破瓶颈', consequence: '有机会大幅提升' },
        { id: 'attr_stabilize', text: '稳固根基，厚积薄发', consequence: '稳妥提升' },
      ],
      effects: { expGain: Math.floor(p.stats.level * 5) },
    }),
  },
  {
    attr: 'family', min: 12,
    check: (p) => ({
      text: '你的家世背景在此地似乎有些影响力。几个看起来颇有身份的人认出了你家族的徽记，纷纷上前攀谈。其中一人提到了最近的一桩大生意...',
      extraChoices: [
        { id: 'attr_network', text: '利用家族人脉拓展关系', consequence: '可能获得重要情报' },
        { id: 'attr_independent', text: '婉拒攀谈，靠自己的力量', consequence: '保持独立性' },
      ],
      effects: { fameChange: 2, wealthChange: Math.floor(p.stats.level * 3) },
    }),
  },
];

function checkAttributeThresholds(player: Player): AttrThresholdEvent | null {
  const triggered: AttrThresholdEvent[] = [];

  for (const threshold of ATTR_THRESHOLDS) {
    const value = player.attributes[threshold.attr];
    if (value >= threshold.min) {
      const flag = `attr_threshold_${threshold.attr}_triggered`;
      if (!player.progress.storyFlags.includes(flag)) {
        const result = threshold.check(player);
        if (result) triggered.push(result);
      }
    }
  }

  if (triggered.length === 0) return null;

  // 合并所有触发的属性事件
  return {
    text: triggered.map(t => t.text).join('\n\n'),
    extraChoices: triggered.flatMap(t => t.extraChoices || []),
    effects: {
      expGain: triggered.reduce((s, t) => s + (t.effects?.expGain || 0), 0),
      fameChange: triggered.reduce((s, t) => s + (t.effects?.fameChange || 0), 0),
      wealthChange: triggered.reduce((s, t) => s + (t.effects?.wealthChange || 0), 0),
    },
  };
}



// ========== 动态命运预感 ==========


interface FateHint {
  text: string;
  intensity: 'faint' | 'clear' | 'strong';
}

function generateFateHint(player: Player): FateHint | null {
  if (!player.endingProgress.targetEndingId) return null;

  const targetEnding = ENDINGS.find(e => e.endingId === player.endingProgress.targetEndingId);
  if (!targetEnding) return null;

  const progress = calculateEndingProgress(player, targetEnding);
  const victoryMet = targetEnding.victoryConditions.filter(c => progress[c] === true).length;
  const victoryTotal = targetEnding.victoryConditions.length;
  const ratio = victoryTotal > 0 ? victoryMet / victoryTotal : 0;

  // 每个结局的命运预感映射
  const HINT_TEMPLATES: Record<string, { faint: string[]; clear: string[]; strong: string[] }> = {
    ending_modern_king: {
      faint: ['你隐约感到，这座城市的未来与你息息相关...'],
      clear: ['命运的齿轮开始转动。金钱与权力的游戏，你已入局。'],
      strong: ['你看见了——那座城市在你的脚下俯首称臣的景象。这是你的命。'],
    },
    ending_immortal_hermit: {
      faint: ['偶尔，你望向天边时，会感到一种说不清的召唤...'],
      clear: ['世俗的纷争渐渐乏味，你越来越向往深山之中的清静。'],
      strong: ['你知道，总有一天你会放下一切，踏上那条寻仙之路。'],
    },
    ending_urban_legend: {
      faint: ['黑暗中似乎有什么在注视着你。不，是你在注视着黑暗。'],
      clear: ['你的名字开始在暗中传播。有人恐惧，有人崇拜。'],
      strong: ['这座城市需要一个新的传说。而你，正是那个书写传说的人。'],
    },
    ending_apocalypse_savior: {
      faint: ['你闻到风中有一丝不祥的气息，平静的日子不会太久了。'],
      clear: ['混乱即将降临。你需要力量——不仅是为了自保。'],
      strong: ['废墟之上，你将举起旗帜。千万人的希望，压在你的肩上。'],
    },
  };

  // 确定强度
  let intensity: 'faint' | 'clear' | 'strong';
  if (ratio >= 0.8) intensity = 'strong';
  else if (ratio >= 0.3) intensity = 'clear';
  else intensity = 'faint';

  // 获取对应模板
  const templates = HINT_TEMPLATES[targetEnding.endingId];
  if (!templates) return null;

  const hints = templates[intensity];
  const hint = hints[Math.floor(Math.random() * hints.length)];

  return { text: hint, intensity };
}

// ========== 回合处理 ==========

export const processTurn = async (player: Player): Promise<TurnResult> => {
  // Demo 模式：走预缓存路径
  if (new URLSearchParams(window.location.search).get('demo') === 'true') {
    const { executeDemoTurn } = await import('../demo/demoOrchestrator');
    return executeDemoTurn(player);
  }

  const context = buildContext(player);
  const provider = getProvider();

  let sceneContent: { text: string; choices: Choice[] };
  let event: GameEvent | null = null;
  let sysResponse: { message: string; type?: string; rewards?: { systemExp?: number } };
  let usedFallback = false;
  let worldShiftSignal: string | undefined;

  // 多智能体：世界导引师 —— 每10回合评估世界转换 (§4)
  if (shouldCheckWorldShift(player.progress.round)) {
    const shiftResult = evaluateWorldShiftLocal(player);
    if (shiftResult.shouldShift) {
      worldShiftSignal = shiftResult.shiftEventIdea;
    }
  }

  // -1. 检查场景切换事件（境界突破时最高优先级）
  const transitionEvent = generateSceneTransitionEvent(player);
  if (transitionEvent) {
    event = transitionEvent;
  }

  // 0. 检查是否有战斗遭遇
  if (!event) {
    event = generateCombatEvent(player);
  }

  try {
    // 1. 生成场景内容
    const generated = await provider.generateScene(context);
    sceneContent = generated;
  } catch (e) {
    console.warn('AI provider failed for scene, using fallback:', e);
    const fallback = await import('./contentGenerator');
    const generated = fallback.generateSceneContent(context);
    sceneContent = generated;
    usedFallback = true;
  }

  // 2. NPC邂逅事件（如果没有战斗）
  let npcEncounter: TurnResult['npcEncounter'];
  if (!event) {
    const npcResult = generateNPCEvent(player);
    if (npcResult) {
      event = npcResult.event;
      npcEncounter = { isNew: npcResult.isNew, npc: npcResult.npc };
    }
  }

  // 商人.txt: 商人邂逅事件（每5-10回合概率触发）(§1.3)
  if (!event && shouldTriggerMerchant(player.progress.round)) {
    const merchantEvent = generateMerchantEvent(player);
    if (merchantEvent) {
      event = merchantEvent;
    }
  }

  // 3. 普通随机事件（如果没有战斗和NPC事件）
  if (!event) {
    try {
      const eventContent = await provider.generateEvent(context);
      if (eventContent) {
        event = {
          id: `evt_${Date.now()}`,
          title: '突发事件',
          description: eventContent.text,
          choices: eventContent.choices,
          type: 'random',
        };
      }
    } catch (e) {
      console.warn('AI provider failed for event, using fallback:', e);
      const fallback = await import('./contentGenerator');
      const eventContent = fallback.generateEvent(context);
      if (eventContent) {
        event = {
          id: `evt_${Date.now()}`,
          title: '突发事件',
          description: eventContent.text,
          choices: eventContent.choices,
          type: 'random',
        };
      }
    }
  }

  // 4.5 系统紧急支援：当玩家生命值过低时触发（弹窗显示，不影响主线）
  let systemIntervention: GameEvent | undefined;
  const intervention = generateSystemIntervention(player);
  if (intervention) {
    systemIntervention = intervention;
  }

  // 多智能体：性格演员 —— 生成系统发言 (§3.5)
  try {
    const personaInput = buildPersonaInput({
      player,
      sceneContext: sceneContent.text.substring(0, 60),
      eventSummary: event ? event.description.substring(0, 60) : sceneContent.text.substring(0, 60),
    });
    const sysMessage = generateSystemDialogueLocal(personaInput);
    sysResponse = { message: sysMessage, rewards: { systemExp: randomInt(2, 8) } };
  } catch (e) {
    console.warn('Persona actor failed, using fallback:', e);
    sysResponse = { message: '叮！系统运行正常。', type: 'info' };
  }

  // 系统签到由 GameMain 的 handleSystemFeature 统一处理，不在此重复调用


  // 5. 道具掉落（非战斗回合随机掉落）
  const droppedItems: Item[] = [];
  if (!event) {
    const droppedItem = generateRandomItem(player.progress.sceneType, player.stats.level);
    if (droppedItem) {
      droppedItems.push(droppedItem);
    }
  }

  // 6. 基础效果 —— 优先使用 AI 返回的 attributeChanges
  const aiEffects = sceneContent.effects || {};
  const effects = {
    hpChange: aiEffects.hpChange ?? aiEffects.hp ?? 0,
    mpChange: aiEffects.mpChange ?? aiEffects.mp ?? 0,
    expGain: aiEffects.expGain ?? aiEffects.exp ?? randomInt(5, 15),
    wealthChange: aiEffects.wealthChange ?? aiEffects.wealth ?? randomInt(-10, 30),
    fameChange: aiEffects.fameChange ?? aiEffects.fame ?? randomInt(-2, 5),
    systemExpGain: sysResponse.rewards?.systemExp || 0,
  };

  // 6. 成就检测
  const globalAchievements = getGlobalAchievements();
  const achievementResult = checkAllAchievements(player, globalAchievements);

  // 5级天赋触发
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

  // ending.md.txt: 世界状态更新（时间线推进、地点更新、引擎标记）
  const worldUpdate = updateWorldStateForTurn(player);

  // ending.md.txt: NPC 自主行动
  const npcAutonomyActions = triggerNPCAutonomy(player);

  // ending.md.txt: 提取关键事件用于记忆压缩
  const keyEvent = extractKeyEvent(
    {
      effects,
      droppedItems,
      newAchievements: achievementResult.newAchievements.map((a) => a.id),
      combatResult: null,
    },
    player
  );

  // 多智能体：结局守望者 —— 评估结局进度并尝试条件变形 (§5)
  const endingCheck = checkEndingTrigger(player);
  const targetEnding = ENDINGS.find((e) => e.endingId === player.endingProgress.targetEndingId);
  if (targetEnding && !endingCheck.triggered) {
    const evaluation = evaluateEndingLocal(player);
    // 如果结局不再可能，尝试条件变形
    if (!evaluation.isStillPossible) {
      const mutation = mutateEndingConditions(player, targetEnding);
      if (mutation.mutated) {
        // 更新结局条件（注：修改引用对象，在 setPlayer 时生效）
        targetEnding.victoryConditions = mutation.newConditions;
      }
    }
  }

    // 属性阈值触发特殊叙事事件
  const attrEvent = checkAttributeThresholds(player);
  if (attrEvent) {
    const attrText = `

【天赋/属性共鸣】
${attrEvent.text}`;
    if (event) {
      event.description += attrText;
      if (attrEvent.extraChoices && attrEvent.extraChoices.length > 0) {
        event.choices = [...event.choices, ...attrEvent.extraChoices];
      }
    } else {
      sceneContent.text += attrText;
      if (attrEvent.extraChoices && attrEvent.extraChoices.length > 0) {
        sceneContent.choices = [...sceneContent.choices, ...attrEvent.extraChoices];
      }
    }
    if (attrEvent.effects) {
      effects.expGain += attrEvent.effects.expGain || 0;
      effects.fameChange += attrEvent.effects.fameChange || 0;
      effects.wealthChange += attrEvent.effects.wealthChange || 0;
    }
    }

  // 动态命运预感（基于结局进度）
  const fateHint = generateFateHint(player);
  let fateText = '';
  if (fateHint) {
    const prefix = fateHint.intensity === 'strong' ? '⚡命运昭示⚡' : fateHint.intensity === 'clear' ? '◇命运预感◇' : '·命运低语·';
    fateText = `

${prefix}
${fateHint.text}`;
  }

  // 检测当前活跃的剧情节点，并标记为已触发
  const activeNode = getActiveStoryNode(
    player.progress.sceneType,
    player.progress.sceneLevel,
    player.progress.storyFlags,
  );
  const newStoryFlags: string[] = [];
  if (activeNode) {
    newStoryFlags.push(`arc_${player.progress.sceneType}_${activeNode.id}`);
  }

  // 合并事件到场景文本中（不再丢弃 AI 场景）
  const eventInsert = event
    ? `\n\n途中，${event.title}发生了——\n${event.description}`
    : '';
  const finalSceneText = sceneContent.text + eventInsert + fateText;

  // 合并场景选择和事件选择（事件选项在前，场景选项在后补充）
  const mergedChoices = event
    ? [...event.choices, ...sceneContent.choices.slice(0, 2)]
    : sceneContent.choices;

  return {
    sceneText: finalSceneText,
    event,
    systemIntervention,
    choices: mergedChoices,
    systemMessage: sysResponse.message,
        newAchievements: achievementResult.newAchievements.map((a) => a.id),
    achievementMessages: achievementResult.messages,
    effects,
    usedFallback,
    combatResult: null,
    droppedItems,
    talentChoice,
    endingTriggered: endingCheck.triggered ? endingCheck : undefined,
    worldStateUpdate: {
      newTimeline: worldUpdate.worldState.timeline,
      newFlags: worldUpdate.newFlags,
    },
    npcAutonomyActions: npcAutonomyActions.map((a) => ({
      npcId: a.npcId,
      name: a.name,
      worldHint: a.worldHint,
      newStatus: a.newStatus,
      newGoal: a.newGoal,
      newMemory: a.newMemory,
    })),
    npcEncounter,
    newStoryFlags: newStoryFlags.length > 0 ? newStoryFlags : undefined,
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
  };
  storyFlags: string[];
  combatResult: CombatResult | null;
  droppedItems: Item[];
  sceneTransition?: string;
  rewardedTalent?: Talent;
  /** ending.md.txt: NPC 关系值变化 */
  npcRelationshipDelta?: number;
  npcName?: string;
  /** 剧情中消耗的物品名列表（从背包中删除） */
  consumedItemNames?: string[];
  /** 系统紧急支援：临时战力增益 */
  temporaryBuff?: { combatPower: number; duration: number };
  /** 系统紧急支援：限时道具ID（本回合结束后自动回收） */
  temporaryItem?: string;
  /** 系统紧急支援：临时战力增益 */
  temporaryBuff?: { combatPower: number; duration: number };
  /** 系统紧急支援：限时道具ID（本回合结束后自动回收） */
  temporaryItem?: string;
}

export const processChoice = (player: Player, choiceId: string, event: GameEvent | null, sceneText?: string, sceneChoices?: Choice[]): ChoiceResult => {
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
      const reason = combat.defeatReason ? ` ${combat.defeatReason}` : '';
      resultText = `你不敌${combat.enemyName}（等级${combat.enemyLevel}），身负重伤...${reason}`;
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

	  // 系统紧急支援选项处理
	  if (choiceId === 'sys_power') {
	    const boost = Math.floor(player.stats.combatPower * 0.5);
	    return {
	      resultText: `叮！${player.system.name}启动战力增幅！你的战斗力暂时提升${boost}点！`,
	      effects: {
	        hpChange: 0, mpChange: 0, expGain: 0,
	        wealthChange: 0, fameChange: 0, systemExpGain: randomInt(5, 10),
	      },
	      storyFlags: [],
	      combatResult: null,
	      droppedItems: [],
	      temporaryBuff: { combatPower: boost, duration: 1 },
	    };
	  }
	  if (choiceId === 'sys_shield') {
	    const healAmount = Math.floor(player.stats.maxHp * 0.5);
	    return {
	      resultText: `叮！${player.system.name}释放护体神光！恢复了${healAmount}点生命值！`,
	      effects: {
	        hpChange: healAmount, mpChange: 0, expGain: 0,
	        wealthChange: 0, fameChange: 0, systemExpGain: randomInt(5, 10),
	      },
	      storyFlags: [],
	      combatResult: null,
	      droppedItems: [],
	    };
	  }
	  if (choiceId === 'sys_artifact') {
	    const tempItemName = '天降神兵（临时）';
	    const tempItem: Item = {
	      id: 'temp_artifact_' + Date.now(),
	      name: tempItemName,
	      description: `${player.system.name}召唤的限时逆天法宝，用完即消失`,
	      rarity: 'legendary',
	      type: 'weapon',
	      effect: { combatPower: 50, maxHp: 50 },
	    };
	    return {
	      resultText: `叮！${player.system.name}召唤了限时逆天法宝【${tempItemName}】！战斗结束后将自动消失！`,
	      effects: {
	        hpChange: 20, mpChange: 20, expGain: 0,
	        wealthChange: 0, fameChange: 0, systemExpGain: randomInt(5, 10),
	      },
	      storyFlags: [],
	      combatResult: null,
	      droppedItems: [tempItem],
	      temporaryItem: tempItem.id,
	    };
	  }
	  if (choiceId === 'sys_refuse') {
	    return {
	      resultText: `你拒绝了${player.system.name}的援助。${player.system.name}："宿主...祝你好运。"`,
	      effects: {
	        hpChange: 0, mpChange: 0, expGain: randomInt(5, 15),
	        wealthChange: 0, fameChange: randomInt(1, 5), systemExpGain: 5,
	      },
	      storyFlags: [],
	      combatResult: null,
	      droppedItems: [],
	    };
	  }

  // === 智能选择路由：根据选择文本关键词决定真实后果 ===
  const allChoices = event?.choices || sceneChoices || [];
  const selectedChoice = allChoices.find((c) => c.id === choiceId);
  const choiceText = selectedChoice?.text || '';
  const choiceConsequence = selectedChoice?.consequence || '';

  // 提取 NPC 名称和关系值
  let npcName: string | undefined;
  let npcRelationshipDelta: number | undefined;
  if (event?.title) {
    const npcs = NPC_TEMPLATES[player.progress.sceneType] || NPC_TEMPLATES['modern_city'];
    for (const tpl of npcs) {
      if (event.title.includes(tpl.name)) {
        npcName = tpl.name;
        const tplChoice = tpl.choices.find((c) => c.id === choiceId);
        if (tplChoice) npcRelationshipDelta = tplChoice.relationshipDelta;
        break;
      }
    }
  }

  	  // 关键词分析选择意图
	  const isCombat = /战斗|攻击|抢夺|挑战|杀|出手|打|战|吞噬|劫持/.test(choiceText + choiceConsequence);
	  const isCooperate = /合作|帮忙|护送|加入|接受|帮助|协助|联手|结盟|招募|跟随/.test(choiceText + choiceConsequence);
	  const isTrade = /交易|购买|买|卖|交换|贸易|出价/.test(choiceText + choiceConsequence);
	  const isFlee = /逃跑|离开|拒绝|婉拒|绕道|忽略|删除|断开|回避/.test(choiceText + choiceConsequence);
	  const isExplore = /探索|搜寻|调查|寻找|查看|观察/.test(choiceText + choiceConsequence);
	  const isCultivate = /修炼|冥想|打坐|闭关|提升|突破/.test(choiceText + choiceConsequence);
	  const isHeal = /疗伤|恢复|休息|治疗/.test(choiceText + choiceConsequence);
	  const isObtainItem = /获得|得到|拿到|捡起|收取|收下|拿走|夺取|缴获|接受|发现|找到|搜出|开出|掉落|奖励|赠予|拾取/.test(choiceText + choiceConsequence);

	  // 从【】标记中提取物品名（仅从选项文本中提取，避免剧情描述中的物品误入背包）
	  const extractedItems = extractItemsFromText(choiceText + choiceConsequence);

	  // 检测文本是否暗示获得物品（无【】标记时的后备）
	  const impliesItem = !extractedItems.length && impliesItemAcquisition(choiceText + choiceConsequence);

	  const droppedItems: Item[] = [];
	  const consumedItemNames: string[] = [];
	  let consumedItemEffects: Record<string, number> = {};
	  let resultText = '';
	  let combatResult: CombatResult | null = null;

	  if (isCombat) {
	    const enemyLevel = Math.max(1, player.stats.level + randomInt(-2, 3));
	    const enemyPower = enemyLevel * enemyLevel * 15 + randomInt(20, 80);
	    const enemyName = event?.title?.replace('遭遇', '') || '未知敌人';
	    const mockEvent: GameEvent = {
	      id: 'dynamic_combat_' + Date.now(), title: '遭遇' + enemyName,
	      description: '等级' + enemyLevel + '的' + enemyName + '，战力约' + enemyPower,
	      choices: [], type: 'combat',
	    };
	    combatResult = resolveCombat(player, choiceId, mockEvent);
	    if (combatResult.isVictory) {
	      resultText = '你击败了' + enemyName + '！获得' + combatResult.loot.exp + '经验和' + combatResult.loot.wealth + '财富。';
	      const loot = generateCombatLoot(player.progress.sceneType, enemyLevel, true);
	      if (loot) droppedItems.push(loot);
	    } else {
	      const reason = combatResult.defeatReason ? ' ' + combatResult.defeatReason : '';
	      resultText = '你不敌' + enemyName + '，身负重伤...' + reason;
	    }
	  } else if (extractedItems.length > 0) {
	    // 【】标记的物品：判断是获得还是消耗（单个循环，避免重复添加）
	    const combinedText = choiceText + choiceConsequence;
	    for (const item of extractedItems) {
	      const idx = combinedText.indexOf(`【${item.name}】`);
	      const surrounding = idx >= 0
	        ? combinedText.substring(Math.max(0, idx - 20), idx + item.name.length + 24)
	        : '';
	      const isConsume = /消耗|使用|服用|吃掉|喝掉|用掉|吞服|注射|花费/.test(surrounding);
	      const isObtain = /获得|得到|拿到|捡到|捡起|收取|收下|拿走|夺取|缴获|发现|找到|搜出|开出|掉落|奖励|赠予|拾取|领取/.test(surrounding);
	      if (isConsume && !isObtain) {
	        // 消耗物品：必须从背包扣除，不检查是否有货（没有则不扣，但绝不改为获取）
	        consumedItemNames.push(item.name);
	        // 累加消耗品的实际效果（从物品模板读取）
	        if (item.template.effect) {
	          for (const [k, v] of Object.entries(item.template.effect)) {
	            const key = k === 'hp' ? 'hpChange' : k === 'mp' ? 'mpChange' : k === 'exp' ? 'expGain' : k === 'wealth' ? 'wealthChange' : k;
	            consumedItemEffects[key] = (consumedItemEffects[key] || 0) + (v as number);
	          }
	        }
	      } else {
	        // 获得物品：剧情说获取才获取，不推理不兜底
	        droppedItems.push({ id: generateItemId(), ...item.template });
	      }
	    }
	    const parts: string[] = [];
	    if (droppedItems.length > 0) parts.push('获得' + droppedItems.map(i => '【' + i.name + '】').join('、'));
	    if (consumedItemNames.length > 0) parts.push('消耗了' + consumedItemNames.map(n => '【' + n + '】').join('、'));
	    resultText = parts.join('，') + '！';
	  } else if (impliesItem || isObtainItem) {
	    // 文本暗示获得物品但没有【】标记——生成上下文相关物品
	    const contextItem = generateContextualItem(
	      player.progress.sceneType, player.stats.level, choiceText + choiceConsequence
	    );
	    if (contextItem) {
	      droppedItems.push(contextItem);
	      resultText = '你获得了【' + contextItem.name + '】！';
	    } else {
	      resultText = choiceConsequence || '你得到了一些有用的东西。';
	    }
	  } else if (isCooperate && npcName) {
	    npcRelationshipDelta = (npcRelationshipDelta || 0) + 15;
	    const rewardItem = generateRandomItem(player.progress.sceneType, player.stats.level);
	    if (rewardItem) droppedItems.push(rewardItem);
	    resultText = npcName + '对你的信任增加了。' + (rewardItem ? '你获得了【' + rewardItem.name + '】。' : '你们的关系更进一步。');
	  } else if (isTrade) {
	    const cost = randomInt(30, 150);
	    const tradeItem = generateRandomItem(player.progress.sceneType, player.stats.level);
	    if (tradeItem) droppedItems.push(tradeItem);
	    resultText = '交易完成！' + (tradeItem ? '获得了【' + tradeItem.name + '】。' : '');
	  } else if (isFlee) {
	    npcRelationshipDelta = (npcRelationshipDelta || 0) - 5;
	    resultText = '你选择了避开冲突，安全离开。';
	  } else if (isExplore) {
	    const foundItem = generateRandomItem(player.progress.sceneType, player.stats.level);
	    if (foundItem && checkProbability(0.4)) droppedItems.push(foundItem);
	    resultText = foundItem ? '探索中发现了【' + foundItem.name + '】！' : '四处搜寻了一番，没有特别的发现。';
	  } else if (isCultivate) {
	    resultText = '你静心修炼，灵气在经脉中流转。修为精进了一步！';
	  } else if (isHeal) {
	    resultText = '你找到了安全的地方调息，伤势恢复了不少。';
	  } else {
	    resultText = choiceConsequence || '你的选择带来了意想不到的结果...';
	  }

  // 计算效果（叠加消耗品效果）
  const effects = {
    hpChange: (combatResult ? -combatResult.playerDamage : (isHeal ? randomInt(15, 30) : isCombat ? randomInt(-15, 0) : randomInt(-5, 10))) + (consumedItemEffects.hpChange || 0),
    mpChange: (isCultivate ? randomInt(10, 20) : isHeal ? randomInt(5, 15) : randomInt(-5, 10)) + (consumedItemEffects.mpChange || 0),
    expGain: (combatResult ? combatResult.loot.exp : (isCultivate ? randomInt(30, 60) : isExplore ? randomInt(15, 30) : randomInt(5, 15))) + (consumedItemEffects.expGain || 0),
    wealthChange: (combatResult ? combatResult.loot.wealth : (isTrade ? randomInt(-150, -30) : isExplore ? randomInt(0, 30) : randomInt(-10, 20))) + (consumedItemEffects.wealthChange || 0),
    fameChange: (combatResult?.isVictory ? randomInt(1, 5) : (isCooperate ? randomInt(2, 8) : randomInt(-2, 5))) + (consumedItemEffects.fameChange || 0),
    systemExpGain: randomInt(3, 10) + (consumedItemEffects.systemExpGain || 0),
  };

  // 用实际数值替换泛化的结果文本
  if (resultText === '你的选择带来了意想不到的结果...') {
    const parts: string[] = [];
    if (effects.hpChange > 0) parts.push(`生命恢复${effects.hpChange}点`);
    if (effects.hpChange < 0) parts.push(`受到${Math.abs(effects.hpChange)}点伤害`);
    if (effects.mpChange > 0) parts.push(`灵力回复${effects.mpChange}点`);
    if (effects.mpChange < 0) parts.push(`消耗${Math.abs(effects.mpChange)}点灵力`);
    if (effects.expGain > 0) parts.push(`获得${effects.expGain}点经验`);
    if (effects.wealthChange > 0) parts.push(`获得${effects.wealthChange}财富`);
    if (effects.wealthChange < 0) parts.push(`花费${Math.abs(effects.wealthChange)}财富`);
    if (effects.fameChange > 0) parts.push(`声望+${effects.fameChange}`);
    if (effects.fameChange < 0) parts.push(`声望${effects.fameChange}`);
    resultText = parts.length > 0 ? parts.join('，') + '。' : '没有显著变化。';
  }

  return {
    resultText,
    effects,
    storyFlags: combatResult?.isVictory ? ['defeated_' + combatResult.enemyName] : [],
    combatResult,
    droppedItems,
    npcRelationshipDelta,
    npcName,
    consumedItemNames: consumedItemNames.length > 0 ? consumedItemNames : undefined,
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

  // 更新财富声望
  updated.stats.wealth = Math.max(0, updated.stats.wealth + totalEffects.wealthChange);
  updated.stats.fame = Math.max(0, updated.stats.fame + totalEffects.fameChange);

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

  // 添加掉落的道具到背包（去重）
  const allDroppedItems = [...turnResult.droppedItems, ...choiceResult.droppedItems];
  if (allDroppedItems.length > 0) {
    const existingIds = new Set(updated.inventory.map(i => i.id));
    const newItems = allDroppedItems.filter(i => !existingIds.has(i.id));
    updated.inventory = [...updated.inventory, ...newItems];
  }

  // 处理剧情中消耗的道具（按名称从背包中删除第一个匹配）
  if (choiceResult.consumedItemNames && choiceResult.consumedItemNames.length > 0) {
    const consumedNames = new Set(choiceResult.consumedItemNames);
    let removed: string[] = [];
    updated.inventory = updated.inventory.filter(item => {
      if (consumedNames.has(item.name) && !removed.includes(item.name)) {
        removed.push(item.name);
        return false;
      }
      return true;
    });
  }

  // 添加剧情节点标记
  if (turnResult.newStoryFlags && turnResult.newStoryFlags.length > 0) {
    for (const flag of turnResult.newStoryFlags) {
      if (!updated.progress.storyFlags.includes(flag)) {
        updated.progress.storyFlags = [...updated.progress.storyFlags, flag];
      }
    }
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

  // 自动存档由 GameMain 的 saveGameToDB 统一处理
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
