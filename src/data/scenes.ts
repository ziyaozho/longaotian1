import type { SceneDefinition } from '../types';

export const SCENES: SceneDefinition[] = [
  {
    id: 'modern_city',
    name: '现代都市',
    description: '繁华的现代社会，科技发达，暗流涌动。普通人中隐藏着觉醒者，商界、政界、地下世界交织成一张巨大的网。',
    difficulty: 1,
    maxAge: 80,
    attributeModifiers: { intelligence: 2, family: 2 },
    specialRules: ['科技道具效果+20%', '功法修炼速度-10%', '财富获取+15%'],
    stylePrompt: '以现代都市小说风格描写，强调摩天大楼、霓虹灯、科技感和暗流涌动的地下世界。可以有商界争斗、地下拳赛、神秘组织等元素。',
    realmNames: ['普通人', '觉醒者', '进化者', '超凡者', '传说级', '神话级'],
  },
  {
    id: 'cultivation',
    name: '修仙世界',
    description: '灵气充沛的玄幻大陆，宗门林立，妖兽横行。凡人通过修炼可以飞天遁地，追求长生大道。',
    difficulty: 2,
    maxAge: 500,
    attributeModifiers: { talent: 3, physique: 2, luck: 1 },
    specialRules: ['修炼速度+30%', '灵草灵药效果+25%', '妖兽掉落+20%'],
    stylePrompt: '以古典修仙小说风格描写，强调灵气、洞府、宗门、法宝、丹药、功法。可以有秘境探索、宗门大比、斩妖除魔等经典元素。',
    realmNames: ['炼气期', '筑基期', '金丹期', '元婴期', '化神期', '渡劫期', '大乘期', '真仙'],
  },
  {
    id: 'urban_fantasy',
    name: '都市玄幻',
    description: '现代都市中灵气复苏，古老的修炼体系与现代科技碰撞。异能者、古武者、修士共存于繁华都市之中。',
    difficulty: 2,
    maxAge: 120,
    attributeModifiers: { talent: 2, intelligence: 2, appearance: 1 },
    specialRules: ['双修效果+25%', '都市势力影响力+20%', '古遗迹探索+15%'],
    stylePrompt: '以都市玄幻小说风格描写，融合现代都市元素和古典修仙。可以有大学天才、地下拍卖会、古武世家、灵气复苏等情节。',
    realmNames: ['凡人', '武者', '宗师', '大宗师', '武圣', '武帝', '武神'],
  },
  {
    id: 'apocalypse',
    name: '末世降临',
    description: '丧尸病毒爆发，文明崩溃，资源匮乏。幸存者在废墟中挣扎求生，强者建立避难所，弱者沦为炮灰。',
    difficulty: 3,
    maxAge: 60,
    attributeModifiers: { physique: 3, luck: -1, family: -2 },
    specialRules: ['物资稀缺，财富效果-30%', '战斗经验获取+40%', '感染抗性+20%'],
    stylePrompt: '以末世小说风格描写，强调废墟、丧尸、资源争夺、人性考验。可以有避难所建设、物资搜集、变异兽、幸存者团队等情节。',
    realmNames: ['普通人', '强化者', '进化者', '超凡者', '主宰者', '末世之王'],
  },
  {
    id: 'apoc_fantasy',
    name: '末世玄幻',
    description: '末日降临后，天地法则改变，灵气与辐射交织。幸存者在废墟中修炼，变异生物与丧尸并存，形成全新的修炼体系。',
    difficulty: 4,
    maxAge: 100,
    attributeModifiers: { physique: 2, talent: 2, family: -1 },
    specialRules: ['变异能量吸收+30%', '辐射区域修炼+20%', '变异兽掉落+25%'],
    stylePrompt: '以末世玄幻小说风格描写，融合末世废土和修仙元素。可以有辐射区修炼、变异灵根、废土宗门、辐射兽等独特设定。',
    realmNames: ['废土幸存者', '觉醒者', '变异者', '法则掌控者', '末世神明', '混沌之主'],
  },
  {
    id: 'hidden_immortal',
    name: '洪荒世界',
    description: '【隐藏场景】天地初开的洪荒时代，先天神魔并存，圣位空缺，各族争霸。这是最原始也最危险的修炼世界。',
    difficulty: 5,
    maxAge: 1000,
    unlockRequirement: 'ach_immortal_path',
    attributeModifiers: { talent: 5, physique: 3, luck: 2, intelligence: 2 },
    specialRules: ['先天灵宝掉落率+50%', '法则领悟+40%', '所有属性成长+25%'],
    stylePrompt: '以洪荒流小说风格描写，强调先天灵宝、大道法则、巫妖大战、圣人博弈。可以有紫霄宫听道、夺宝大战、立教成圣等史诗情节。',
    realmNames: ['凡灵', '地仙', '天仙', '金仙', '大罗金仙', '准圣', '圣人', '天道'],
  },
  {
    id: 'hidden_cyber',
    name: '赛博修仙',
    description: '【隐藏场景】未来世界，意识上传、机械飞升与灵能修炼并存。修真者通过神经网络修炼，法宝是量子计算机，丹药是纳米药剂。',
    difficulty: 4,
    maxAge: 200,
    unlockRequirement: 'ach_cyber_pioneer',
    attributeModifiers: { intelligence: 5, talent: 2, appearance: -1 },
    specialRules: ['科技修仙融合+40%', '数据空间修炼+30%', '机械法宝效果+35%'],
    stylePrompt: '以赛博朋克+修仙融合风格描写，强调霓虹灯、义体、神经网络、数据空间、量子法宝。可以有黑客修仙、AI宗门、虚拟现实渡劫等独特设定。',
    realmNames: ['底层代码', '程序猿', '系统管理员', '架构师', 'AI领主', '量子神灵', '宇宙核心'],
  },
  {
    id: 'hidden_demon',
    name: '魔神纪元',
    description: '【隐藏场景】深渊入侵后的世界，魔气弥漫，正道衰落。修炼者必须在魔化与坚守之间寻找平衡，以魔证道。',
    difficulty: 5,
    maxAge: 300,
    unlockRequirement: 'ach_demon_heart',
    attributeModifiers: { physique: 4, talent: 3, luck: -2 },
    specialRules: ['魔气修炼速度+50%', '入魔风险存在但战力+60%', '正道势力敌对'],
    stylePrompt: '以黑暗流/魔道小说风格描写，强调深渊、魔气、堕落、以杀证道。可以有吞噬进化、魔道争锋、深渊入侵、以魔证道等黑暗向情节。',
    realmNames: ['凡人', '魔徒', '魔将', '魔王', '魔君', '魔帝', '魔神', '混沌魔主'],
  },
];

export const getSceneById = (id: string): SceneDefinition | undefined => {
  return SCENES.find(s => s.id === id);
};

export const getAvailableScenes = (unlockedAchievements: string[]): SceneDefinition[] => {
  return SCENES.filter(scene => {
    if (!scene.unlockRequirement) return true;
    return unlockedAchievements.includes(scene.unlockRequirement);
  });
};
