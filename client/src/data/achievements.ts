import type { Achievement } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  // 进度类成就
  {
    id: 'ach_first_step',
    name: '踏上征途',
    description: '完成第一次龙傲天之旅',
    category: 'progress',
    hidden: false,
    condition: { type: 'survive_rounds', rounds: 1 },
    reward: { wealth: 100 },
    icon: 'footprints',
  },
  {
    id: 'ach_survivor',
    name: '幸存者',
    description: '在任意场景中存活30回合',
    category: 'progress',
    hidden: false,
    condition: { type: 'survive_rounds', rounds: 30 },
    reward: { attributeBonus: { physique: 2 } },
    icon: 'shield',
  },
  {
    id: 'ach_veteran',
    name: '老兵不死',
    description: '在任意场景中存活60回合',
    category: 'progress',
    hidden: false,
    condition: { type: 'survive_rounds', rounds: 60 },
    reward: { attributeBonus: { physique: 3, luck: 2 } },
    icon: 'medal',
  },
  {
    id: 'ach_reach_level_10',
    name: '初露锋芒',
    description: '等级达到10级',
    category: 'progress',
    hidden: false,
    condition: { type: 'reach_level', level: 10 },
    reward: { attributeBonus: { talent: 1 } },
    icon: 'trending-up',
  },
  {
    id: 'ach_reach_level_50',
    name: '一方强者',
    description: '等级达到50级',
    category: 'progress',
    hidden: false,
    condition: { type: 'reach_level', level: 50 },
    reward: { attributeBonus: { talent: 3, physique: 2 } },
    icon: 'crown',
  },
  {
    id: 'ach_reach_level_100',
    name: '巅峰存在',
    description: '等级达到100级',
    category: 'progress',
    hidden: false,
    condition: { type: 'reach_level', level: 100 },
    reward: { title: '巅峰强者', attributeBonus: { talent: 5, physique: 3, intelligence: 3 } },
    icon: 'star',
  },

  // 战斗类成就
  {
    id: 'ach_first_blood',
    name: '第一滴血',
    description: '首次战胜敌人',
    category: 'combat',
    hidden: false,
    condition: { type: 'custom', description: '在战斗中获胜一次' },
    reward: { attributeBonus: { physique: 1 } },
    icon: 'sword',
  },
  {
    id: 'ach_combat_power_1000',
    name: '千钧之力',
    description: '战斗力达到1000',
    category: 'combat',
    hidden: false,
    condition: { type: 'combat_power', value: 1000 },
    reward: { attributeBonus: { physique: 2 } },
    icon: 'zap',
  },
  {
    id: 'ach_combat_power_10000',
    name: '万人敌',
    description: '战斗力达到10000',
    category: 'combat',
    hidden: false,
    condition: { type: 'combat_power', value: 10000 },
    reward: { attributeBonus: { physique: 5, talent: 2 } },
    icon: 'flame',
  },
  {
    id: 'ach_undefeated',
    name: '不败传说',
    description: '连续10场战斗不败',
    category: 'combat',
    hidden: false,
    condition: { type: 'custom', description: '连续10场战斗胜利' },
    reward: { attributeBonus: { physique: 3, luck: 2 } },
    icon: 'award',
  },

  // 财富类成就
  {
    id: 'ach_rich',
    name: '小富即安',
    description: '财富值达到10000',
    category: 'social',
    hidden: false,
    condition: { type: 'obtain_wealth', amount: 10000 },
    reward: { attributeBonus: { family: 2 } },
    icon: 'coins',
  },
  {
    id: 'ach_wealthy',
    name: '富甲一方',
    description: '财富值达到100000',
    category: 'social',
    hidden: false,
    condition: { type: 'obtain_wealth', amount: 100000 },
    reward: { attributeBonus: { family: 3, luck: 2 } },
    icon: 'gem',
  },
  {
    id: 'ach_tycoon',
    name: '富可敌国',
    description: '财富值达到1000000',
    category: 'social',
    hidden: false,
    condition: { type: 'obtain_wealth', amount: 1000000 },
    reward: { title: '财神', attributeBonus: { family: 5, luck: 3 } },
    icon: 'banknote',
  },

  // 系统类成就
  {
    id: 'ach_system_level_5',
    name: '系统进化',
    description: '将系统升至5级',
    category: 'system',
    hidden: false,
    condition: { type: 'system_level', level: 5 },
    reward: { attributeBonus: { talent: 2 } },
    icon: 'cpu',
  },
  {
    id: 'ach_system_level_10',
    name: '系统觉醒',
    description: '将系统升至满级',
    category: 'system',
    hidden: false,
    condition: { type: 'system_level', level: 10 },
    reward: { attributeBonus: { talent: 5, intelligence: 3 } },
    icon: 'sparkles',
  },
  {
    id: 'ach_task_master',
    name: '任务达人',
    description: '累计完成50个任务',
    category: 'system',
    hidden: false,
    condition: { type: 'complete_tasks', count: 50 },
    reward: { attributeBonus: { intelligence: 3 } },
    icon: 'check-circle',
  },

  // 探索类成就（解锁隐藏内容）
  {
    id: 'ach_all_scenes',
    name: '场景征服者',
    description: '体验过所有基础场景',
    category: 'explore',
    hidden: false,
    condition: { type: 'custom', description: '在所有5个基础场景中都进行过游戏' },
    reward: { unlockScene: 'hidden_immortal' },
    icon: 'map',
  },
  {
    id: 'ach_immortal_path',
    name: '仙路漫漫',
    description: '在修仙场景中达到化神期',
    category: 'explore',
    hidden: false,
    condition: { type: 'custom', description: '在修仙场景达到化神期' },
    reward: { unlockScene: 'hidden_immortal', title: '半步仙人' },
    icon: 'mountain',
  },
  {
    id: 'ach_cyber_pioneer',
    name: '赛博先驱',
    description: '在现代都市场景中财富达到50万且智商达到15',
    category: 'explore',
    hidden: true,
    condition: { type: 'custom', description: '现代都市场景：财富>=500000 且 智商>=15' },
    reward: { unlockScene: 'hidden_cyber', title: '科技先驱' },
    icon: 'cpu',
  },
  {
    id: 'ach_demon_heart',
    name: '入魔',
    description: '在任意场景中做出10次黑暗选择',
    category: 'explore',
    hidden: true,
    condition: { type: 'custom', description: '累计做出10次黑暗/邪恶选择' },
    reward: { unlockScene: 'hidden_demon', title: '魔心已种' },
    icon: 'skull',
  },
  {
    id: 'ach_devourer',
    name: '吞噬者',
    description: '在末世场景中吞噬100个敌人',
    category: 'explore',
    hidden: true,
    condition: { type: 'custom', description: '在末世场景累计吞噬100个敌人' },
    reward: { unlockSystem: 'devour_system', title: '吞噬者' },
    icon: 'circle-dot',
  },
  {
    id: 'ach_time_lord',
    name: '时间领主',
    description: '活过100岁且在3个不同场景中都达到50级以上',
    category: 'explore',
    hidden: true,
    condition: { type: 'custom', description: '单局活到100岁，且累计3个场景达到50级' },
    reward: { unlockSystem: 'time_system', title: '时间领主' },
    icon: 'clock',
  },

  // 秘密成就
  {
    id: 'ach_perfect_start',
    name: '天选之子',
    description: '初始属性全部分配到10以上（需要20点刚好分配6个属性）',
    category: 'secret',
    hidden: true,
    condition: { type: 'custom', description: '初始属性每项>=3（20点分配6项，每项平均3.33）' },
    reward: { attributeBonus: { luck: 5 } },
    icon: 'dice',
  },
  {
    id: 'ach_legendary_beauty',
    name: '倾国倾城',
    description: '颜值达到满值20',
    category: 'secret',
    hidden: false,
    condition: { type: 'attribute_threshold', attribute: 'appearance', value: 20 },
    reward: { title: '绝世容颜', attributeBonus: { appearance: 2, luck: 3 } },
    icon: 'heart',
  },
  {
    id: 'ach_genius',
    name: '绝世天才',
    description: '智商达到满值20',
    category: 'secret',
    hidden: false,
    condition: { type: 'attribute_threshold', attribute: 'intelligence', value: 20 },
    reward: { title: '绝世天才', attributeBonus: { intelligence: 2, talent: 3 } },
    icon: 'brain',
  },
  {
    id: 'ach_max_all_attrs',
    name: '全能神',
    description: '所有属性达到20以上',
    category: 'secret',
    hidden: false,
    condition: { type: 'custom', description: '所有属性>=20' },
    reward: { title: '全能之神', attributeBonus: { talent: 5, appearance: 5, intelligence: 5, physique: 5, family: 5, luck: 5 } },
    icon: 'crown',
  },
];

export const getAchievementById = (id: string) => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

export const checkAchievement = (achievement: Achievement, player: import('../types').Player): boolean => {
  const { condition } = achievement;
  
  switch (condition.type) {
    case 'reach_level':
      return player.stats.level >= condition.level;
    case 'complete_tasks':
      return player.completedTasks.length >= condition.count;
    case 'survive_rounds':
      return player.progress.round >= condition.rounds;
    case 'attribute_threshold':
      return (player.attributes as unknown as Record<string, number>)[condition.attribute] >= condition.value;
    case 'reach_age':
      return player.progress.age >= condition.age;
    case 'obtain_wealth':
      return player.stats.wealth >= condition.amount;
    case 'combat_power':
      return player.stats.combatPower >= condition.value;
    case 'system_level':
      return player.system.level >= condition.level;
    default:
      return false;
  }
};
