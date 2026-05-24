/**
 * 年龄阶段系统 — 让年龄驱动叙事
 *
 * 每个回合 = 一年，不同年龄段有不同的叙事主题、身体变化和专属事件。
 */

export type LifeStage = 'childhood' | 'youth' | 'prime' | 'middle' | 'elder';

export interface LifeStageDef {
  stage: LifeStage;
  label: string;
  ageRange: [number, number];
  theme: string;
  /** 身体状态描述（注入提示词） */
  bodyDesc: string;
  /** 属性倾向（特定属性更容易成长） */
  favoredAttributes: string[];
  /** 属性衰减 */
  attributeDecay: string[];
  /** 每个年龄阶段自己的专属随机事件池 */
  eventPool: string[];
}

export const LIFE_STAGES: LifeStageDef[] = [
  {
    stage: 'childhood',
    label: '少年',
    ageRange: [0, 20],
    theme: '成长、学习、奠基',
    bodyDesc: '你正处于少年时期，身体和心智都在快速成长。精力充沛，学习能力强，但经验尚浅。',
    favoredAttributes: ['talent', 'physique'],
    attributeDecay: [],
    eventPool: [
      '你在修炼中遇到了瓶颈，一位长者愿意指点你',
      '同龄人向你发出挑战，这是证明自己的机会',
      '你发现了一处隐蔽的修炼场所，灵气比外界浓郁',
      '家中来信，提到了一些关于你身世的线索',
    ],
  },
  {
    stage: 'youth',
    label: '青年',
    ageRange: [21, 40],
    theme: '闯荡、交友、崛起',
    bodyDesc: '你正值青年，气血旺盛，意气风发。这是闯荡世界、结交盟友、快速崛起的黄金时期。',
    favoredAttributes: ['combatPower', 'appearance', 'luck'],
    attributeDecay: [],
    eventPool: [
      '一位神秘的陌生人注意到了你的潜力，想邀你加入某个组织',
      '你听闻远方有一处秘境即将开启，无数强者正赶往那里',
      '在一次冲突中，你意外救下了一个身份不凡的人',
      '你收到了一个来自陌生人的挑战书，署名令你震惊',
    ],
  },
  {
    stage: 'prime',
    label: '壮年',
    ageRange: [41, 60],
    theme: '巅峰、争霸、成就',
    bodyDesc: '你正处于人生的巅峰时期。实力、智慧、声望都达到了前所未有的高度，举手投足间自有一代强者的风范。',
    favoredAttributes: ['intelligence', 'fame', 'combatPower'],
    attributeDecay: ['physique'],
    eventPool: [
      '你的名声已经传遍四方，有人慕名而来想拜你为师',
      '一场席卷整个世界的风暴正在酝酿，你被卷入其中',
      '你发现了一个足以颠覆世界认知的秘密',
      '昔日的对手再度出现，这次他带来了令人意外的消息',
    ],
  },
  {
    stage: 'middle',
    label: '中年',
    ageRange: [61, 80],
    theme: '守成、传承、反思',
    bodyDesc: '你已步入中年，鬓角开始斑白。虽然战斗力仍处于高位，但你开始感受到岁月的力量。这是思考传承的时刻。',
    favoredAttributes: ['intelligence', 'fame'],
    attributeDecay: ['physique', 'combatPower'],
    eventPool: [
      '你开始思考自己的传承，是否要收一名弟子？',
      '旧伤复发，让你意识到自己并非不可战胜',
      '你发现年轻一代中有一个人的眼神非常像当年的你',
      '一个来自过去的故人突然出现，带来了尘封已久的消息',
    ],
  },
  {
    stage: 'elder',
    label: '老年',
    ageRange: [81, 999],
    theme: '迟暮、告别、传承',
    bodyDesc: '你已步入暮年，白发苍苍，脸上布满了岁月的痕迹。你的身体已不复当年，但你的智慧和阅历却达到了顶峰。',
    favoredAttributes: ['intelligence', 'fame'],
    attributeDecay: ['physique', 'combatPower', 'appearance'],
    eventPool: [
      '你预感到自己的时间不多了，决定完成最后一件大事',
      '一位昔日的故人已经先你一步离去，你参加了他的葬礼',
      '你决定将自己的毕生所学传授给值得托付的人',
      '你回望自己的一生，有些选择至今仍让你耿耿于怀',
    ],
  },
];

/** 根据年龄获取人生阶段 */
export function getLifeStage(age: number): LifeStageDef {
  for (const stage of LIFE_STAGES) {
    if (age >= stage.ageRange[0] && age <= stage.ageRange[1]) {
      return stage;
    }
  }
  // 超过最大年龄（999+），返回老年
  return LIFE_STAGES[LIFE_STAGES.length - 1];
}

/** 获取人生阶段描述文字（含年龄的完整句子） */
export function getLifeStageDescription(age: number, sceneType: string): string {
  const stage = getLifeStage(age);
  const yearsInWorld = `你在这个世界已经生活了${age}年。`;

  // 根据身份不同定制
  if (sceneType === 'cultivation' || sceneType === 'hidden_immortal') {
    return `${yearsInWorld}\n${stage.bodyDesc}在修真界，${age}岁的${stage.label}期修士，正是${stage.theme}的关键阶段。`;
  }
  if (sceneType === 'apocalypse' || sceneType === 'apoc_fantasy') {
    return `${yearsInWorld}\n在末世中能活到${age}岁本身就是一种实力的证明。${stage.bodyDesc}`;
  }
  return `${yearsInWorld}\n${stage.bodyDesc}`;
}

/** 获取该年龄阶段对身体属性的修正 */
export function getAttributeModifiers(age: number): Record<string, number> {
  const stage = getLifeStage(age);
  const mods: Record<string, number> = {};

  for (const attr of stage.favoredAttributes) {
    mods[attr] = 1;
  }
  for (const attr of stage.attributeDecay) {
    mods[attr] = -1;
  }
  return mods;
}

/** 判断是否需要启用"闭关"模式跳过平庸年份（长寿场景 + 高年龄） */
export function shouldEnableCultivationSkip(age: number, sceneType: string): boolean {
  const longLifeScenes = ['cultivation', 'hidden_immortal', 'hidden_cyber', 'hidden_demon'];
  if (!longLifeScenes.includes(sceneType)) return false;
  // 至少中年以后才可能闭关
  const stage = getLifeStage(age);
  return stage.stage === 'middle' || stage.stage === 'elder';
}
