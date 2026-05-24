export interface AttributeDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  effect: string;
}

export const ATTRIBUTE_DEFS: AttributeDefinition[] = [
  {
    key: 'talent',
    name: '天赋',
    description: '决定修炼速度和技能领悟能力',
    icon: 'sparkles',
    color: 'text-game-gold',
    effect: '每点+5%经验获取，+3%技能领悟概率',
  },
  {
    key: 'appearance',
    name: '颜值',
    description: '影响社交、机缘和NPC好感度',
    icon: 'heart',
    color: 'text-pink-400',
    effect: '每点+5%好感度获取，+3%奇遇触发概率',
  },
  {
    key: 'intelligence',
    name: '智商',
    description: '影响功法领悟、科技研发和策略选择',
    icon: 'brain',
    color: 'text-game-blue',
    effect: '每点+5%功法领悟速度，+3%科技研发效率',
  },
  {
    key: 'physique',
    name: '体质',
    description: '决定生命值、战斗力和生存能力',
    icon: 'dumbbell',
    color: 'text-red-400',
    effect: '每点+10生命值，+5战斗力，+3%伤害减免',
  },
  {
    key: 'family',
    name: '家境',
    description: '影响初始资源和财富获取',
    icon: 'home',
    color: 'text-green-400',
    effect: '每点+200初始财富，+5%财富获取',
  },
  {
    key: 'luck',
    name: '运气',
    description: '影响随机事件、暴击率和机缘',
    icon: 'clover',
    color: 'text-game-green',
    effect: '每点+3%暴击率，+5%好运事件概率',
  },
];

export const INITIAL_POINTS = 20;
export const MIN_ATTRIBUTE = 1;
export const MAX_ATTRIBUTE = 10;

export const getAttributeDef = (key: string): AttributeDefinition | undefined => {
  return ATTRIBUTE_DEFS.find(a => a.key === key);
};
