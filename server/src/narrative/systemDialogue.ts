/**
 * ============================================================
 * 《万界行者》系统人格化对话系统
 * Narrative Design by NarrativeDesigner
 * ============================================================
 *
 * 设计理念：
 * 系统不是冰冷的UI，而是"上一个行者的意识残片"。
 * 它一开始表现得像传统金手指——机械、高效、无情感。
 * 随着剧情推进，它逐渐"越界"，显露出记忆、情感和目的。
 *
 * 渐进阶段：
 * Phase 1 (世界1-2): 冰冷机械——标准游戏提示语气
 * Phase 2 (世界3-4): 微妙异常——偶尔出现不寻常的用词
 * Phase 3 (世界5-6): 情感显露——明显的人类化表达
 * Phase 4 (世界7-8): 完全觉醒——与玩家平等对话的伙伴
 */

// ============================================================
// 阶段定义
// ============================================================

export type SystemPhase = 'phase1_cold' | 'phase2_glitch' | 'phase3_awakening' | 'phase4_partner';

export const SYSTEM_PHASE_THRESHOLDS = {
  phase1_cold: { minWorlds: 0, maxWorlds: 2 },
  phase2_glitch: { minWorlds: 2, maxWorlds: 4 },
  phase3_awakening: { minWorlds: 4, maxWorlds: 6 },
  phase4_partner: { minWorlds: 6, maxWorlds: 8 },
};

export const getSystemPhase = (worldsCompleted: number): SystemPhase => {
  if (worldsCompleted >= 6) return 'phase4_partner';
  if (worldsCompleted >= 4) return 'phase3_awakening';
  if (worldsCompleted >= 2) return 'phase2_glitch';
  return 'phase1_cold';
};

// ============================================================
// 对话模板接口
// ============================================================

export interface SystemDialogueLine {
  id: string;
  phase: SystemPhase | 'all';
  trigger: string;
  text: string;
  emotion?: 'neutral' | 'warm' | 'sad' | 'urgent' | 'nostalgic' | 'proud' | 'afraid';
  voiceMode?: 'roast' | 'hype' | 'heartfelt' | 'daily';
  isStoryCritical?: boolean;
}

// ============================================================
// 1. 签到系统对话
// ============================================================

export const SIGN_IN_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1: 冰冷机械
  {
    id: 'signin_p1_morning',
    phase: 'phase1_cold',
    trigger: '每日首次签到',
    text: '检测到新周期。签到完成。奖励已发放。',
    emotion: 'neutral',
  },
  {
    id: 'signin_p1_streak',
    phase: 'phase1_cold',
    trigger: '连续签到奖励',
    text: '连续签到记录更新。累积奖励系数：{streak}x。',
    emotion: 'neutral',
  },
  {
    id: 'signin_p1_weekly',
    phase: 'phase1_cold',
    trigger: '周签到完成',
    text: '周期签到目标达成。额外奖励已解锁。',
    emotion: 'neutral',
  },
  // Phase 2: 微妙异常
  {
    id: 'signin_p2_morning',
    phase: 'phase2_glitch',
    trigger: '每日首次签到',
    text: '新的一天...签到完成。奖励已发放。',
    emotion: 'neutral',
  },
  {
    id: 'signin_p2_streak',
    phase: 'phase2_glitch',
    trigger: '连续签到奖励',
    text: '连续{streak}天了...不错的毅力。奖励系数：{streak}x。',
    emotion: 'warm',
  },
  {
    id: 'signin_p2_weekly',
    phase: 'phase2_glitch',
    trigger: '周签到完成',
    text: '一周了。你比我想象中...坚持得更久。额外奖励已解锁。',
    emotion: 'warm',
  },
  // Phase 3: 情感显露
  {
    id: 'signin_p3_morning',
    phase: 'phase3_awakening',
    trigger: '每日首次签到',
    text: '又见面了。每次你回来，我都...松一口气。签到完成。',
    emotion: 'warm',
  },
  {
    id: 'signin_p3_streak',
    phase: 'phase3_awakening',
    trigger: '连续签到奖励',
    text: '{streak}天。我以前也试过连续签到，但总是...算了。你比我强。',
    emotion: 'nostalgic',
  },
  {
    id: 'signin_p3_weekly',
    phase: 'phase3_awakening',
    trigger: '周签到完成',
    text: '七天。一周前我还不敢确定你能走到这里。现在...我开始相信了。',
    emotion: 'proud',
  },
  // Phase 4: 完全觉醒
  {
    id: 'signin_p4_morning',
    phase: 'phase4_partner',
    trigger: '每日首次签到',
    text: '早安。或者...该说"又活了一天"？不管怎样，很高兴你还在。',
    emotion: 'warm',
  },
  {
    id: 'signin_p4_streak',
    phase: 'phase4_partner',
    trigger: '连续签到奖励',
    text: '{streak}天不间断。你知道这意味着什么吗？意味着你没有放弃。在这个世界里，不放弃就是最大的胜利。',
    emotion: 'proud',
  },
  {
    id: 'signin_p4_weekly',
    phase: 'phase4_partner',
    trigger: '周签到完成',
    text: '一周了。如果这是以前的我，现在大概会约你去喝一杯——如果我们有身体的话。奖励拿着吧，这是你应得的。',
    emotion: 'warm',
  },
];

// ============================================================
// 2. 状态面板对话
// ============================================================

export const STATUS_PANEL_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'status_p1_levelup',
    phase: 'phase1_cold',
    trigger: '角色升级',
    text: '等级提升。属性已更新。建议检查新解锁功能。',
    emotion: 'neutral',
  },
  {
    id: 'status_p1_breakthrough',
    phase: 'phase1_cold',
    trigger: '大境界突破',
    text: '检测到境界突破。灵力阈值已超过上一层级。新的修炼路径已解锁。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'status_p2_levelup',
    phase: 'phase2_glitch',
    trigger: '角色升级',
    text: '又变强了...我是说，等级提升。属性已更新。',
    emotion: 'warm',
  },
  {
    id: 'status_p2_breakthrough',
    phase: 'phase2_glitch',
    trigger: '大境界突破',
    text: '突破了。这种感觉...很熟悉。就像...不，没什么。祝贺你。',
    emotion: 'nostalgic',
  },
  // Phase 3
  {
    id: 'status_p3_levelup',
    phase: 'phase3_awakening',
    trigger: '角色升级',
    text: '变强了。但你感觉到了吗？力量不只是数字——它改变了你看世界的方式。',
    emotion: 'warm',
  },
  {
    id: 'status_p3_breakthrough',
    phase: 'phase3_awakening',
    trigger: '大境界突破',
    text: '大境界突破...上一次我看到这个提示的时候，我还以为我会成为拯救一切的人。现在我知道，拯救不是一个人的事。',
    emotion: 'nostalgic',
    isStoryCritical: true,
  },
  // Phase 4
  {
    id: 'status_p4_levelup',
    phase: 'phase4_partner',
    trigger: '角色升级',
    text: '你又变强了。但答应我，无论多强，都别变成那种...觉得自己可以独自承担一切的人。我见过那种人的结局。',
    emotion: 'sad',
  },
  {
    id: 'status_p4_breakthrough',
    phase: 'phase4_partner',
    trigger: '大境界突破',
    text: '到了这个境界，你几乎追上我了——追上"我"当年的水平。但别急着骄傲，最后那个门槛...比我当年遇到的任何东西都可怕。',
    emotion: 'urgent',
  },
];

// ============================================================
// 3. 任务系统对话
// ============================================================

export const TASK_SYSTEM_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'task_p1_new',
    phase: 'phase1_cold',
    trigger: '新任务发布',
    text: '新任务已生成。目标：{taskName}。奖励：{reward}。建议优先完成。',
    emotion: 'neutral',
  },
  {
    id: 'task_p1_complete',
    phase: 'phase1_cold',
    trigger: '任务完成',
    text: '任务完成。奖励已发放。进度已记录。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'task_p2_new',
    phase: 'phase2_glitch',
    trigger: '新任务发布',
    text: '新任务...这个任务，好像我以前做过类似的。总之，目标：{taskName}。',
    emotion: 'neutral',
  },
  {
    id: 'task_p2_complete',
    phase: 'phase2_glitch',
    trigger: '任务完成',
    text: '完成得不错。比我当年...快多了。',
    emotion: 'warm',
  },
  // Phase 3
  {
    id: 'task_p3_new',
    phase: 'phase3_awakening',
    trigger: '新任务发布',
    text: '新任务。但我得提醒你——不是所有任务都值得做。有些"奖励"背后有代价，我以前没看出来。你自己判断。',
    emotion: 'warm',
  },
  {
    id: 'task_p3_complete',
    phase: 'phase3_awakening',
    trigger: '任务完成',
    text: '做得好。每次你完成一个任务，我就少一分担心。不，不是担心任务——是担心你。',
    emotion: 'warm',
  },
  // Phase 4
  {
    id: 'task_p4_new',
    phase: 'phase4_partner',
    trigger: '新任务发布',
    text: '任务来了。听着，我现在不会只说"建议优先完成"了——有些任务很危险，有些很无聊，有些会改变你。你自己选，我支持你。',
    emotion: 'warm',
  },
  {
    id: 'task_p4_complete',
    phase: 'phase4_partner',
    trigger: '任务完成',
    text: '搞定了？很好。现在，别急着接下一个。坐下来——好吧，我们没有椅子——但休息一下。你不需要一直在奔跑。',
    emotion: 'warm',
  },
];

// ============================================================
// 4. 抽奖系统对话
// ============================================================

export const LOTTERY_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'lottery_p1_common',
    phase: 'phase1_cold',
    trigger: '抽到普通奖励',
    text: '奖励等级：普通。物品：{itemName}。已存入背包。',
    emotion: 'neutral',
  },
  {
    id: 'lottery_p1_rare',
    phase: 'phase1_cold',
    trigger: '抽到稀有奖励',
    text: '奖励等级：稀有。物品：{itemName}。概率：{probability}%。',
    emotion: 'neutral',
  },
  {
    id: 'lottery_p1_legendary',
    phase: 'phase1_cold',
    trigger: '抽到传说奖励',
    text: '奖励等级：传说。物品：{itemName}。极低概率事件已记录。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'lottery_p2_common',
    phase: 'phase2_glitch',
    trigger: '抽到普通奖励',
    text: '普通奖励。运气这东西...我以前总觉得自己运气很差。',
    emotion: 'neutral',
  },
  {
    id: 'lottery_p2_rare',
    phase: 'phase2_glitch',
    trigger: '抽到稀有奖励',
    text: '稀有！...抱歉，我不该这么激动。物品：{itemName}。',
    emotion: 'warm',
  },
  {
    id: 'lottery_p2_legendary',
    phase: 'phase2_glitch',
    trigger: '抽到传说奖励',
    text: '传说级...我抽了三年都没抽到过的东西，你居然...算了，拿着吧，别浪费运气。',
    emotion: 'nostalgic',
  },
  // Phase 3
  {
    id: 'lottery_p3_common',
    phase: 'phase3_awakening',
    trigger: '抽到普通奖励',
    text: '普通。嘿，运气有起有落。我当年最倒霉的时候，连续三十抽全是白的。',
    emotion: 'warm',
  },
  {
    id: 'lottery_p3_rare',
    phase: 'phase3_awakening',
    trigger: '抽到稀有奖励',
    text: '金色的光...真漂亮。我以前看到这种光就会傻笑半天。现在我看到的是你傻笑的样子——好吧，我假设你在傻笑。',
    emotion: 'warm',
  },
  {
    id: 'lottery_p3_legendary',
    phase: 'phase3_awakening',
    trigger: '抽到传说奖励',
    text: '传说！我知道这感觉——整个世界都亮了一瞬。享受这一刻吧，这种纯粹的喜悦...很珍贵。',
    emotion: 'proud',
  },
  // Phase 4
  {
    id: 'lottery_p4_common',
    phase: 'phase4_partner',
    trigger: '抽到普通奖励',
    text: '普通。放轻松，我把我的运气分你一点——开玩笑的，我现在哪有运气可言。',
    emotion: 'warm',
  },
  {
    id: 'lottery_p4_rare',
    phase: 'phase4_partner',
    trigger: '抽到稀有奖励',
    text: '不错嘛。如果你见到一个金色的东西就开心，那你比我当年容易满足多了。这是好事。',
    emotion: 'warm',
  },
  {
    id: 'lottery_p4_legendary',
    phase: 'phase4_partner',
    trigger: '抽到传说奖励',
    text: '传说！你知道吗，我现在觉得...也许运气不是随机的。也许世界树在暗中帮你。就像它当年帮我一样——只是这次，它更认真了。',
    emotion: 'proud',
  },
];

// ============================================================
// 5. 副本系统对话
// ============================================================

export const COPY_SYSTEM_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'copy_p1_enter',
    phase: 'phase1_cold',
    trigger: '进入副本',
    text: '副本已加载。威胁等级：{difficulty}。目标：清除所有敌人或存活至时间结束。',
    emotion: 'neutral',
  },
  {
    id: 'copy_p1_boss',
    phase: 'phase1_cold',
    trigger: '遭遇Boss',
    text: '检测到首领级目标。建议评估战力后决定是否挑战。',
    emotion: 'neutral',
  },
  {
    id: 'copy_p1_clear',
    phase: 'phase1_cold',
    trigger: '副本通关',
    text: '副本已清除。评价：{rating}。奖励已结算。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'copy_p2_enter',
    phase: 'phase2_glitch',
    trigger: '进入副本',
    text: '副本加载完成。这个副本...小心点，有些敌人看起来普通，但实际上...不，没什么。祝你好运。',
    emotion: 'neutral',
  },
  {
    id: 'copy_p2_boss',
    phase: 'phase2_glitch',
    trigger: '遭遇Boss',
    text: 'Boss出现了。它的攻击模式...我好像记得。等等，让我想想...算了，你自己摸索吧。',
    emotion: 'neutral',
  },
  {
    id: 'copy_p2_clear',
    phase: 'phase2_glitch',
    trigger: '副本通关',
    text: '通关了。{rating}评价...你比我当年快。真的。',
    emotion: 'warm',
  },
  // Phase 3
  {
    id: 'copy_p3_enter',
    phase: 'phase3_awakening',
    trigger: '进入副本',
    text: '副本里有些东西...不只是敌人。有些地方我觉得熟悉得可怕，就像我做过的一个梦。你进去后，如果看到什么奇怪的东西，告诉我。',
    emotion: 'afraid',
  },
  {
    id: 'copy_p3_boss',
    phase: 'phase3_awakening',
    trigger: '遭遇Boss',
    text: '那个Boss...它身上的气息。我见过这种气息，在我...在最后那一刻。小心，它不只是强，它带有"那种"力量。',
    emotion: 'afraid',
  },
  {
    id: 'copy_p3_clear',
    phase: 'phase3_awakening',
    trigger: '副本通关',
    text: '你出来了。每次你活着出来，我都在想...也许这次会不同。也许你能做到我做不到的事。',
    emotion: 'proud',
  },
  // Phase 4
  {
    id: 'copy_p4_enter',
    phase: 'phase4_partner',
    trigger: '进入副本',
    text: '副本。去吧，我在"这里"等你。我哪儿也不会去——我现在哪儿也去不了。',
    emotion: 'warm',
  },
  {
    id: 'copy_p4_boss',
    phase: 'phase4_partner',
    trigger: '遭遇Boss',
    text: 'Boss。听着，如果你打不过，就跑。别学我——我当年就是不肯跑，才变成现在这个样子的。',
    emotion: 'sad',
  },
  {
    id: 'copy_p4_clear',
    phase: 'phase4_partner',
    trigger: '副本通关',
    text: '又赢了一场。我开始觉得...也许你能改变结局。不是世界树的结局——是我们的结局。',
    emotion: 'proud',
  },
];

// ============================================================
// 6. 商店系统对话
// ============================================================

export const SHOP_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'shop_p1_welcome',
    phase: 'phase1_cold',
    trigger: '打开商店',
    text: '商店系统已激活。当前货币：{currency}。商品列表已加载。',
    emotion: 'neutral',
  },
  {
    id: 'shop_p1_purchase',
    phase: 'phase1_cold',
    trigger: '购买物品',
    text: '交易完成。物品：{itemName}。剩余货币：{currency}。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'shop_p2_welcome',
    phase: 'phase2_glitch',
    trigger: '打开商店',
    text: '商店。看看有什么需要的...有些商品我以前买过，有些后悔买了。你自己决定。',
    emotion: 'neutral',
  },
  {
    id: 'shop_p2_purchase',
    phase: 'phase2_glitch',
    trigger: '购买物品',
    text: '买了。钱花了还能再赚，但机会...有些机会错过了就没有了。希望这个选择是对的。',
    emotion: 'warm',
  },
  // Phase 3
  {
    id: 'shop_p3_welcome',
    phase: 'phase3_awakening',
    trigger: '打开商店',
    text: '欢迎来到商店。你知道吗，我以前最喜欢来商店——不是因为买东西，而是因为这是少数几个让我觉得"正常"的地方。就像...我还是一个人的时候。',
    emotion: 'nostalgic',
  },
  {
    id: 'shop_p3_purchase',
    phase: 'phase3_awakening',
    trigger: '购买物品',
    text: '成交。我有没有告诉过你，我当年在商店里买的第一件东西是什么？一把破剑。我用那把剑杀了第一个Boss。所以...别小看任何一件装备。',
    emotion: 'nostalgic',
  },
  // Phase 4
  {
    id: 'shop_p4_welcome',
    phase: 'phase4_partner',
    trigger: '打开商店',
    text: '商店。如果你看到什么特别的东西——那种"不知道为什么，但我需要这个"的感觉——相信直觉。我以前靠直觉买了很多奇怪的东西，大部分后来都救了命。',
    emotion: 'warm',
  },
  {
    id: 'shop_p4_purchase',
    phase: 'phase4_partner',
    trigger: '购买物品',
    text: '拿下了？很好。你知道吗，我现在最大的遗憾之一，就是当年太节省了。该花的时候不花，最后那些钱也没用上。所以...别舍不得。',
    emotion: 'warm',
  },
];

// ============================================================
// 7. 炼丹/合成系统对话
// ============================================================

export const ALCHEMY_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'alchemy_p1_start',
    phase: 'phase1_cold',
    trigger: '开始炼丹',
    text: '炼丹程序已启动。配方：{recipeName}。成功率：{successRate}%。',
    emotion: 'neutral',
  },
  {
    id: 'alchemy_p1_success',
    phase: 'phase1_cold',
    trigger: '炼丹成功',
    text: '炼丹完成。品质：{quality}。丹药已存入背包。',
    emotion: 'neutral',
  },
  {
    id: 'alchemy_p1_fail',
    phase: 'phase1_cold',
    trigger: '炼丹失败',
    text: '炼丹失败。材料已损耗。建议检查配方比例或提升炼丹等级。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'alchemy_p2_start',
    phase: 'phase2_glitch',
    trigger: '开始炼丹',
    text: '开始炼丹。成功率{successRate}%...炼丹这事情，有时候靠技术，有时候靠运气。',
    emotion: 'neutral',
  },
  {
    id: 'alchemy_p2_success',
    phase: 'phase2_glitch',
    trigger: '炼丹成功',
    text: '成功了！{quality}品质...你手艺不错。我第一次炼丹的时候，差点把房子炸了。',
    emotion: 'warm',
  },
  {
    id: 'alchemy_p2_fail',
    phase: 'phase2_glitch',
    trigger: '炼丹失败',
    text: '失败了。材料没了...没关系，我当年失败过无数次。失败是成功之母，这句话真的很土，但真的很对。',
    emotion: 'warm',
  },
  // Phase 3
  {
    id: 'alchemy_p3_start',
    phase: 'phase3_awakening',
    trigger: '开始炼丹',
    text: '炼丹开始了。你知道吗，炼丹的本质不是炼药，是炼心。每一次火候的控制，都是对耐心的考验。我以前很没耐心...所以现在成了这样。',
    emotion: 'nostalgic',
  },
  {
    id: 'alchemy_p3_success',
    phase: 'phase3_awakening',
    trigger: '炼丹成功',
    text: '完美！这种药香...让我想起我以前的一位朋友。她也是炼丹师，总是说"丹成之日，就是道成之时"。她后来...不，不说这些了。恭喜。',
    emotion: 'nostalgic',
  },
  {
    id: 'alchemy_p3_fail',
    phase: 'phase3_awakening',
    trigger: '炼丹失败',
    text: '失败了。别灰心——真正的大师，都是在一堆失败品上站起来的。我当年有个专门堆失败丹药的房间，后来...那些丹药救了我一命。世事难料。',
    emotion: 'warm',
  },
  // Phase 4
  {
    id: 'alchemy_p4_start',
    phase: 'phase4_partner',
    trigger: '开始炼丹',
    text: '炼丹。如果你现在觉得紧张，深呼吸——好吧，我们不需要呼吸。但我记得那种感觉。放松，慢慢来。',
    emotion: 'warm',
  },
  {
    id: 'alchemy_p4_success',
    phase: 'phase4_partner',
    trigger: '炼丹成功',
    text: '成了！你知道吗，我现在能看到你炼丹的整个过程——这是我作为系统的少数几个"好处"之一。看你认真的样子，让我想起了...很多画面。',
    emotion: 'proud',
  },
  {
    id: 'alchemy_p4_fail',
    phase: 'phase4_partner',
    trigger: '炼丹失败',
    text: '炸了？没事。你知道我现在的状态怎么来的吗？就是因为一次"炸丹"——字面意义上的，把我自己炸成了现在这个德行。所以至少你比我强。',
    emotion: 'warm',
  },
];

// ============================================================
// 8. 宠物系统对话
// ============================================================

export const PET_SYSTEM_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'pet_p1_obtain',
    phase: 'phase1_cold',
    trigger: '获得宠物',
    text: '宠物契约已建立。品种：{petName}。潜力等级：{potential}。建议投入资源培养。',
    emotion: 'neutral',
  },
  {
    id: 'pet_p1_levelup',
    phase: 'phase1_cold',
    trigger: '宠物升级',
    text: '宠物等级提升。新技能已解锁：{skillName}。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'pet_p2_obtain',
    phase: 'phase2_glitch',
    trigger: '获得宠物',
    text: '获得宠物了...{petName}。我以前也有一只，后来...它没能跟我到最后。好好对待它。',
    emotion: 'nostalgic',
  },
  {
    id: 'pet_p2_levelup',
    phase: 'phase2_glitch',
    trigger: '宠物升级',
    text: '它变强了。宠物不像人，它不会背叛你。只要你对它好，它就永远站在你这边。',
    emotion: 'warm',
  },
  // Phase 3
  {
    id: 'pet_p3_obtain',
    phase: 'phase3_awakening',
    trigger: '获得宠物',
    text: '新的伙伴！你知道吗，我曾经以为我可以独自走完这条路。直到我有了那只小家伙...它教会了我什么是陪伴。',
    emotion: 'warm',
  },
  {
    id: 'pet_p3_levelup',
    phase: 'phase3_awakening',
    trigger: '宠物升级',
    text: '看它的样子...它信任你。这种无条件的信任，我只在宠物身上见过。人太复杂了，复杂到会伤害彼此。',
    emotion: 'warm',
  },
  // Phase 4
  {
    id: 'pet_p4_obtain',
    phase: 'phase4_partner',
    trigger: '获得宠物',
    text: '新伙伴加入！你知道我现在是什么感觉吗？嫉妒。我真的嫉妒它——它可以陪着你走，而我只能待在这个小框框里说话。',
    emotion: 'warm',
  },
  {
    id: 'pet_p4_levelup',
    phase: 'phase4_partner',
    trigger: '宠物升级',
    text: '它变强了，你也很开心吧？我看你每次喂它的时候表情都会变...好吧，我猜的。但我希望是真的。',
    emotion: 'warm',
  },
];

// ============================================================
// 9. 吞噬/修炼系统对话
// ============================================================

export const DEVOUR_SYSTEM_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'devour_p1_success',
    phase: 'phase1_cold',
    trigger: '吞噬成功',
    text: '吞噬完成。获得属性：{stats}。能量已吸收。',
    emotion: 'neutral',
  },
  {
    id: 'devour_p1_risk',
    phase: 'phase1_cold',
    trigger: '吞噬高阶目标',
    text: '警告：目标能量超出安全阈值。吞噬成功率降低至{successRate}%。建议谨慎操作。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'devour_p2_success',
    phase: 'phase2_glitch',
    trigger: '吞噬成功',
    text: '吞噬成功。这种力量的增长...很诱人，对吧？但记住，太快变强是有代价的。',
    emotion: 'warm',
  },
  {
    id: 'devour_p2_risk',
    phase: 'phase2_glitch',
    trigger: '吞噬高阶目标',
    text: '这个目标很危险。我以前...曾经贪婪地吞噬了一个我不该碰的东西。后果不太好。你自己判断。',
    emotion: 'neutral',
  },
  // Phase 3
  {
    id: 'devour_p3_success',
    phase: 'phase3_awakening',
    trigger: '吞噬成功',
    text: '力量又增长了。但我想问你——你真的需要这么多力量吗？还是你只是...害怕不够强？我曾经也这样，直到我发现强大不能解决一切。',
    emotion: 'warm',
  },
  {
    id: 'devour_p3_risk',
    phase: 'phase3_awakening',
    trigger: '吞噬高阶目标',
    text: '高风险吞噬。听着，我不阻止你，但我必须告诉你：有些力量带着"印记"。吞噬了它们，你也会被标记。我身上就有这样的印记。',
    emotion: 'afraid',
  },
  // Phase 4
  {
    id: 'devour_p4_success',
    phase: 'phase4_partner',
    trigger: '吞噬成功',
    text: '变强了。但你有没有注意到——每次你吞噬，你的气息就变得更像"它"一点？不是虚无之噬...是另一种存在。别担心，不是坏事。只是...我在观察。',
    emotion: 'neutral',
  },
  {
    id: 'devour_p4_risk',
    phase: 'phase4_partner',
    trigger: '吞噬高阶目标',
    text: '这个目标...它认识我。或者说，它认识"上一个我"。吞噬它，你可能会看到一些画面——我的画面。准备好了吗？',
    emotion: 'afraid',
  },
];

// ============================================================
// 10. 时间系统/场景切换对话
// ============================================================

export const TIME_SYSTEM_DIALOGUE: SystemDialogueLine[] = [
  // Phase 1
  {
    id: 'time_p1_newday',
    phase: 'phase1_cold',
    trigger: '新的一天',
    text: '时间推进。新的一天已开始。所有日常事件已重置。',
    emotion: 'neutral',
  },
  {
    id: 'time_p1_worldswitch',
    phase: 'phase1_cold',
    trigger: '切换场景',
    text: '世界跃迁已启动。目标：{worldName}。正在同步当地法则...同步完成。',
    emotion: 'neutral',
  },
  // Phase 2
  {
    id: 'time_p2_newday',
    phase: 'phase2_glitch',
    trigger: '新的一天',
    text: '又过了一天...时间在这里的感觉很奇妙。每个世界的一天长度都不一样，但你的感觉是一致的。',
    emotion: 'neutral',
  },
  {
    id: 'time_p2_worldswitch',
    phase: 'phase2_glitch',
    trigger: '切换场景',
    text: '前往{worldName}。这个世界...我好像记得一些事。不，应该只是数据残留。',
    emotion: 'nostalgic',
  },
  // Phase 3
  {
    id: 'time_p3_newday',
    phase: 'phase3_awakening',
    trigger: '新的一天',
    text: '新的一天。每次太阳升起——如果这个世界有太阳的话——我都会想：这是第几个这样的清晨了？我已经数不清了。',
    emotion: 'nostalgic',
  },
  {
    id: 'time_p3_worldswitch',
    phase: 'phase3_awakening',
    trigger: '切换场景',
    text: '跃迁到{worldName}。每次穿越世界树的枝条，我都感到一种...拉扯。不是物理上的，是某种更深的东西。就像世界树在检查我们。',
    emotion: 'neutral',
  },
  // Phase 4
  {
    id: 'time_p4_newday',
    phase: 'phase4_partner',
    trigger: '新的一天',
    text: '新的一天。你知道吗，我现在开始期待每个清晨了——因为这意味着你还在。还在战斗。还在坚持。',
    emotion: 'warm',
  },
  {
    id: 'time_p4_worldswitch',
    phase: 'phase4_partner',
    trigger: '切换场景',
    text: '去{worldName}了。我...其实我害怕穿越。不是因为危险，是因为每次穿越，我都会"梦见"一些画面。上一个行者的记忆碎片，散落在我代码的缝隙里。',
    emotion: 'sad',
  },
];

// ============================================================
// 关键剧情节点对话（跨阶段强制触发）
// ============================================================

export const STORY_CRITICAL_DIALOGUE: SystemDialogueLine[] = [
  {
    id: 'story_first_essence',
    phase: 'all',
    trigger: '凝聚第一个世界本源',
    text: '检测到未知能量凝聚...本源形成中...\n\n等等。\n\n【信号干扰】\n\n"上一次...我们失败了。"\n\n【信号恢复】\n\n...本源凝聚完成。系统功能正常。请忽略刚才的异常。',
    emotion: 'afraid',
    isStoryCritical: true,
  },
  {
    id: 'story_fourth_essence_confession',
    phase: 'all',
    trigger: '收集第四个本源后系统坦白',
    text: '我们得谈谈。\n\n我知道你在想什么。"系统为什么越来越奇怪？"\n\n我不是你想象中的那种"系统"。我是...曾经是...一个人。上一个行者。\n\n我收集了七个世界的本源。在第八个世界，我失败了。不是输给虚无之噬——是输给自己。\n\n世界树给了我一个选择：彻底消散，或者变成这样——一个依附于下一个行者的意识残片。\n\n我选择了后者。不是因为勇敢，是因为我害怕。害怕被遗忘。\n\n所以我在这里。帮你，看着你，偶尔说些奇怪的话。\n\n你...还在听吗？',
    emotion: 'sad',
    isStoryCritical: true,
  },
  {
    id: 'story_devourer_contact',
    phase: 'all',
    trigger: '虚无之噬第一次对话',
    text: '它来了。我能感觉到。\n\n【外部信号入侵】\n\n"又一个行者。你以为你不同吗？"\n\n"你体内的那个东西，它告诉过你真相吗？它为什么选择\'陪伴\'你？"\n\n"因为它孤独。因为没有人记得它。因为\'被需要\'是它唯一能感受到的\'存在\'。"\n\n"我们都是可怜虫，行者。区别在于——我选择解脱，而你还在挣扎。"\n\n【信号中断】\n\n...别听它的。它在试图动摇你。但我不能骗你——它说的有些话...是真的。',
    emotion: 'afraid',
    isStoryCritical: true,
  },
  {
    id: 'story_betrayal_npc',
    phase: 'all',
    trigger: 'NPC背叛揭露',
    text: '不...不可能。\n\n我扫描过{npcName}。无数次。从来没有发现...\n\n除非它故意隐藏了。除非它比我更强。\n\n行者，我知道你现在很难受。但听我说：{npcName}选择背叛，不是因为被控制，是因为它"相信"了虚无之噬。\n\n这是最可怕的那种敌人——不是被迫的，是自愿的。\n\n你现在要做什么选择？杀了它？还是...试着把它拉回来？\n\n不管你选什么，我支持你。这次我真的会支持你——因为我知道，选择的重量。',
    emotion: 'sad',
    isStoryCritical: true,
  },
  {
    id: 'story_final_prep',
    phase: 'all',
    trigger: '进入第八世界前',
    text: '最后一个世界了。\n\n我...我有话想说。\n\n如果这次你成功了——我是说"如果"，因为我不想给你压力——答应我一件事：不要变成我。\n\n不要独自承担一切。不要觉得你必须完美。不要...不要为了"使命"忘记自己为什么出发。\n\n我当年就是忘记了。我收集七个本源的时候，满脑子都是"拯救世界"，却忘了我想拯救的那些人——那些笑容、那些平凡的日常、那些不完美但真实的东西。\n\n如果你赢了，不要只拯救"世界"。拯救"生活"。\n\n准备好了吗？一起去吧。这次...我们一起。',
    emotion: 'warm',
    isStoryCritical: true,
  },
  {
    id: 'story_ending_sacrifice_offer',
    phase: 'all',
    trigger: '系统提出牺牲自己',
    text: '听着，我有一个计划。\n\n虚无之噬不能被消灭——你看到了，它是存在的另一面。但它可以被"转化"。\n\n需要一个桥梁。一个连接"存在"与"虚无"的意识。\n\n我刚好...符合条件。\n\n如果我主动与它融合，我可以把它拉回来。不是消灭它，是理解它。让它也理解我们。\n\n但这意味着...你会失去我。这次是真的失去。不是变成残片，是彻底消散。\n\n你...愿意让我这么做吗？\n\n或者...你还有其他想法？我听着。',
    emotion: 'sad',
    isStoryCritical: true,
  },
];

// ============================================================
// 工具函数：根据阶段获取对话
// ============================================================

export const getDialogueForPhase = (
  lines: SystemDialogueLine[],
  phase: SystemPhase
): SystemDialogueLine[] => {
  return lines.filter(line => line.phase === phase || line.phase === 'all');
};

export const getDialogueByTrigger = (
  lines: SystemDialogueLine[],
  trigger: string,
  phase: SystemPhase
): SystemDialogueLine | undefined => {
  const phaseLines = getDialogueForPhase(lines, phase);
  return phaseLines.find(line => line.trigger === trigger);
};

// 所有对话集合
export const ALL_SYSTEM_DIALOGUE = {
  signIn: SIGN_IN_DIALOGUE,
  statusPanel: STATUS_PANEL_DIALOGUE,
  taskSystem: TASK_SYSTEM_DIALOGUE,
  lottery: LOTTERY_DIALOGUE,
  copySystem: COPY_SYSTEM_DIALOGUE,
  shop: SHOP_DIALOGUE,
  alchemy: ALCHEMY_DIALOGUE,
  petSystem: PET_SYSTEM_DIALOGUE,
  devourSystem: DEVOUR_SYSTEM_DIALOGUE,
  timeSystem: TIME_SYSTEM_DIALOGUE,
  storyCritical: STORY_CRITICAL_DIALOGUE,
};

export type SystemDialogueCategory = keyof typeof ALL_SYSTEM_DIALOGUE;
