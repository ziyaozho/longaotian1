import type { SystemDefinition } from '../types';

export const SYSTEMS: SystemDefinition[] = [
  {
    id: 'sign_in',
    name: '每日签到系统',
    description: '最基础的系统，每日签到可获得随机奖励。虽然简单，但持之以恒必有收获。',
    rarity: 'common',
    personality: '机械、准时、偶尔毒舌，喜欢吐槽宿主',
    catchphrase: '叮！签到系统已激活，宿主今天还没签到哦~',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '基础签到', description: '每日获得随机基础奖励', unlockedFeatures: ['daily_reward'], bonuses: {} },
      { level: 3, name: '暴击签到', description: '概率触发暴击翻倍奖励', unlockedFeatures: ['crit_bonus'], bonuses: { luck: 5 } },
      { level: 5, name: '签到成神', description: '签到可获得修为/经验', unlockedFeatures: ['cultivation_reward'], bonuses: { talent: 5 } },
      { level: 7, name: '逆天改命', description: '签到可重置一次当日厄运', unlockedFeatures: ['fortune_reset'], bonuses: { luck: 10 } },
      { level: 10, name: '签到大道', description: '签到直接获得大道感悟', unlockedFeatures: ['dao_insight'], bonuses: { talent: 15, luck: 10 } },
    ],
  },
  {
    id: 'status_panel',
    name: '属性面板系统',
    description: '可视化自身所有属性，精准定位强弱项。数据化是最强的武器。',
    rarity: 'common',
    personality: '冷静、数据化、客观理性，像一台超级计算机',
    catchphrase: '属性面板已展开，宿主当前战力：战五渣',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '基础面板', description: '查看自身基础属性', unlockedFeatures: ['view_stats'], bonuses: {} },
      { level: 2, name: '敌人扫描', description: '查看目标敌人属性', unlockedFeatures: ['scan_enemy'], bonuses: { intelligence: 3 } },
      { level: 3, name: '弱点分析', description: '分析敌人弱点和克制方法', unlockedFeatures: ['weakness_analysis'], bonuses: { intelligence: 5 } },
      { level: 5, name: '全知视角', description: '查看隐藏属性和潜力', unlockedFeatures: ['hidden_stats'], bonuses: { intelligence: 10 } },
      { level: 7, name: '未来推演', description: '推演不同选择的结果', unlockedFeatures: ['future_sim'], bonuses: { intelligence: 15 } },
      { level: 10, name: '天道之眼', description: '看破一切虚妄和伪装', unlockedFeatures: ['true_sight'], bonuses: { intelligence: 25 } },
    ],
  },
  {
    id: 'task_system',
    name: '任务发布系统',
    description: '自动发布主线、支线、日常任务，完成任务获得丰厚奖励。',
    rarity: 'common',
    personality: '严格、认真、奖惩分明，像个严厉的导师',
    catchphrase: '叮！新任务已发布，请宿主尽快完成',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '基础任务', description: '发布简单日常任务', unlockedFeatures: ['daily_tasks'], bonuses: {} },
      { level: 2, name: '主线推进', description: '自动追踪主线剧情任务', unlockedFeatures: ['main_quests'], bonuses: {} },
      { level: 3, name: '隐藏任务', description: '发现隐藏任务和彩蛋', unlockedFeatures: ['hidden_quests'], bonuses: { luck: 3 } },
      { level: 5, name: '连锁任务', description: '任务完成后触发后续', unlockedFeatures: ['chain_quests'], bonuses: { intelligence: 5 } },
      { level: 7, name: '世界任务', description: '参与改变世界的大事件', unlockedFeatures: ['world_quests'], bonuses: { fame: 10 } },
      { level: 10, name: '天命任务', description: '承担天命，改变世界线', unlockedFeatures: ['destiny_quests'], bonuses: { talent: 10, luck: 10 } },
    ],
  },
  {
    id: 'lottery_system',
    name: '抽奖系统',
    description: '消耗积分进行抽奖，可获得稀有道具、技能、属性加成。欧洲人专属。',
    rarity: 'rare',
    personality: '浮夸、爱搞事、看热闹不嫌事大，喜欢用"恭喜宿主"开头',
    catchphrase: '叮！抽奖系统激活！试试手气吧，非酋宿主~',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '普通抽奖', description: '基础奖池抽奖', unlockedFeatures: ['basic_lottery'], bonuses: {} },
      { level: 2, name: '高级奖池', description: '解锁高级奖品', unlockedFeatures: ['advanced_pool'], bonuses: { luck: 3 } },
      { level: 3, name: '保底机制', description: '十连抽保底稀有', unlockedFeatures: ['pity_system'], bonuses: { luck: 5 } },
      { level: 5, name: '限定奖池', description: '限时限定奖品', unlockedFeatures: ['limited_pool'], bonuses: { luck: 8 } },
      { level: 7, name: '命运转盘', description: '可抽取命运级奖品', unlockedFeatures: ['destiny_wheel'], bonuses: { luck: 12 } },
      { level: 10, name: '混沌抽奖', description: '连天道都可抽取', unlockedFeatures: ['chaos_lottery'], bonuses: { luck: 20 } },
    ],
  },
  {
    id: 'copy_system',
    name: '副本挑战系统',
    description: '进入各种副本挑战，击败BOSS获取稀有奖励。副本难度随等级提升。',
    rarity: 'rare',
    personality: '热血、好战、充满斗志，喜欢怂恿宿主去打架',
    catchphrase: '叮！副本系统已激活！宿主，去战斗吧！',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '普通副本', description: '挑战基础副本', unlockedFeatures: ['normal_dungeon'], bonuses: {} },
      { level: 2, name: '精英副本', description: '挑战精英难度', unlockedFeatures: ['elite_dungeon'], bonuses: { physique: 3 } },
      { level: 3, name: '组队副本', description: '可组队挑战', unlockedFeatures: ['team_dungeon'], bonuses: { physique: 5 } },
      { level: 5, name: '深渊副本', description: '挑战深渊难度', unlockedFeatures: ['abyss_dungeon'], bonuses: { physique: 8 } },
      { level: 7, name: '世界BOSS', description: '参与世界BOSS战', unlockedFeatures: ['world_boss'], bonuses: { physique: 12 } },
      { level: 10, name: '无尽塔', description: '挑战无限层数', unlockedFeatures: ['endless_tower'], bonuses: { physique: 20 } },
    ],
  },
  {
    id: 'shop_system',
    name: '系统商城',
    description: '使用积分/功德/魔点等货币购买道具、技能、属性。只有你想不到，没有你买不到。',
    rarity: 'rare',
    personality: '精明、市侩、唯利是图，但商品质量有保障',
    catchphrase: '叮！系统商城开张！宿主，有钱就是爹！',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '基础商城', description: '购买基础道具', unlockedFeatures: ['basic_shop'], bonuses: {} },
      { level: 2, name: '技能商店', description: '购买技能书', unlockedFeatures: ['skill_shop'], bonuses: {} },
      { level: 3, name: '折扣特权', description: '享受会员折扣', unlockedFeatures: ['discount'], bonuses: { wealth: 5 } },
      { level: 5, name: '稀有商品', description: '刷新稀有物品', unlockedFeatures: ['rare_items'], bonuses: { luck: 5 } },
      { level: 7, name: '拍卖行', description: '参与竞拍稀有物品', unlockedFeatures: ['auction'], bonuses: { wealth: 10 } },
      { level: 10, name: '天道商店', description: '购买天道级物品', unlockedFeatures: ['heaven_shop'], bonuses: { wealth: 20, luck: 10 } },
    ],
  },
  {
    id: 'alchemy_system',
    name: '炼丹/制造系统',
    description: '炼制丹药、打造法宝、制造道具。自给自足，丰衣足食。',
    rarity: 'epic',
    personality: '严谨、专注、追求完美，对失败零容忍',
    catchphrase: '叮！炼丹系统激活！火候很重要，宿主别炸炉了',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '基础炼制', description: '炼制基础丹药', unlockedFeatures: ['basic_alchemy'], bonuses: {} },
      { level: 2, name: '法宝打造', description: '打造低级法宝', unlockedFeatures: ['weapon_craft'], bonuses: { intelligence: 3 } },
      { level: 3, name: '高级丹方', description: '解锁高级丹方', unlockedFeatures: ['advanced_recipes'], bonuses: { intelligence: 5 } },
      { level: 5, name: '宗师境界', description: '炼制成功率大幅提升', unlockedFeatures: ['master_craft'], bonuses: { intelligence: 10 } },
      { level: 7, name: '神级炼制', description: '可炼制神级丹药', unlockedFeatures: ['god_craft'], bonuses: { intelligence: 15 } },
      { level: 10, name: '造化之手', description: '创造全新的配方', unlockedFeatures: ['creation'], bonuses: { intelligence: 25, talent: 10 } },
    ],
  },
  {
    id: 'pet_system',
    name: '灵宠/伙伴系统',
    description: '收服灵宠、召唤伙伴，与你并肩作战。培养宠物提升战力。',
    rarity: 'epic',
    personality: '温柔、可爱、有点傲娇，像个贴心的小伙伴',
    catchphrase: '叮！灵宠系统激活！宿主，要对我好一点哦~',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '灵宠捕捉', description: '捕捉低级灵宠', unlockedFeatures: ['pet_catch'], bonuses: {} },
      { level: 2, name: '伙伴召唤', description: '召唤战斗伙伴', unlockedFeatures: ['summon'], bonuses: { luck: 3 } },
      { level: 3, name: '宠物进化', description: '灵宠可进化升级', unlockedFeatures: ['pet_evolve'], bonuses: { luck: 5 } },
      { level: 5, name: '神兽召唤', description: '召唤神兽级伙伴', unlockedFeatures: ['divine_summon'], bonuses: { luck: 8 } },
      { level: 7, name: '心灵感应', description: '与宠物心意相通', unlockedFeatures: ['telepathy'], bonuses: { talent: 5 } },
      { level: 10, name: '万兽之王', description: '统御万兽', unlockedFeatures: ['beast_king'], bonuses: { talent: 10, luck: 10 } },
    ],
  },
  {
    id: 'devour_system',
    name: '吞噬进化系统',
    description: '【隐藏系统】吞噬万物获取进化点，不断突破生命层次。以吞噬证道，以毁灭求存。',
    rarity: 'legendary',
    unlockRequirement: 'ach_devourer',
    personality: '贪婪、冷酷、充满食欲，永远吃不饱',
    catchphrase: '叮！吞噬系统激活！宿主，我饿了...',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '基础吞噬', description: '吞噬弱小生物获取能量', unlockedFeatures: ['basic_devour'], bonuses: { physique: 5 } },
      { level: 2, name: '能力掠夺', description: '概率掠夺被吞噬者能力', unlockedFeatures: ['ability_steal'], bonuses: { physique: 8 } },
      { level: 3, name: '群体吞噬', description: '范围吞噬多个目标', unlockedFeatures: ['aoe_devour'], bonuses: { physique: 12 } },
      { level: 5, name: '法则吞噬', description: '吞噬法则碎片', unlockedFeatures: ['law_devour'], bonuses: { physique: 15, talent: 5 } },
      { level: 7, name: '世界吞噬', description: '吞噬小世界本源', unlockedFeatures: ['world_devour'], bonuses: { physique: 20, talent: 10 } },
      { level: 10, name: '混沌吞噬', description: '吞噬混沌，重塑宇宙', unlockedFeatures: ['chaos_devour'], bonuses: { physique: 30, talent: 15 } },
    ],
  },
  {
    id: 'time_system',
    name: '时间回溯系统',
    description: '【隐藏系统】操控时间流速，回溯过去，预见未来。时间就是力量。',
    rarity: 'legendary',
    unlockRequirement: 'ach_time_lord',
    personality: '神秘、沧桑、看透一切，说话像谜语人',
    catchphrase: '叮！时间系统激活。过去已逝，未来未至，唯有当下...',
    maxLevel: 10,
    upgrades: [
      { level: 1, name: '时间感知', description: '感知时间流速变化', unlockedFeatures: ['time_sense'], bonuses: { intelligence: 5 } },
      { level: 2, name: '时间加速', description: '局部加速自身时间', unlockedFeatures: ['time_accel'], bonuses: { intelligence: 8 } },
      { level: 3, name: '时间减速', description: '减速敌人时间', unlockedFeatures: ['time_slow'], bonuses: { intelligence: 12 } },
      { level: 5, name: '时间回溯', description: '回溯到过去某个节点', unlockedFeatures: ['time_rewind'], bonuses: { intelligence: 15, luck: 5 } },
      { level: 7, name: '时间停止', description: '短暂停止局部时间', unlockedFeatures: ['time_stop'], bonuses: { intelligence: 20 } },
      { level: 10, name: '时间长河', description: '自由穿梭于时间长河', unlockedFeatures: ['time_river'], bonuses: { intelligence: 30, luck: 10 } },
    ],
  },
];

export const getSystemById = (id: string): SystemDefinition | undefined => {
  return SYSTEMS.find(s => s.id === id);
};

export const getAvailableSystems = (unlockedAchievements: string[]): SystemDefinition[] => {
  return SYSTEMS.filter(sys => {
    if (!sys.unlockRequirement) return true;
    return unlockedAchievements.includes(sys.unlockRequirement);
  });
};

export const getSystemMaxLevel = (id: string): number => {
  const sys = getSystemById(id);
  return sys?.maxLevel || 10;
};
