import type { Player } from '../types';

/* ========== 预设角色 ========== */
export const DEMO_PLAYER: Partial<Player> = {
  attributes: {
    talent: 9,
    appearance: 6,
    intelligence: 7,
    physique: 6,
    family: 5,
    luck: 7,
  },
  stats: {
    level: 1,
    exp: 0,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    combatPower: 15,
    wealth: 500,
    fame: 10,
    gold: 0,
  },
};

/* ========== 演示配置 ========== */
export const DEMO_SCENE = 'cultivation';
export const DEMO_SYSTEM = 'devour_evolution';

/* ========== 事件序列定义 ========== */
export type DemoPhase = 'intro' | 'turn1' | 'turn2' | 'climax' | 'ending';

export interface DemoPhaseConfig {
  id: DemoPhase;
  label: string;
  highlight: string;
  durationMs: number;
  precacheEventId: string;
  narrationTech: string;
  narrationExp: string;
}

export const DEMO_PHASES: DemoPhaseConfig[] = [
  {
    id: 'intro',
    label: '开局',
    highlight: '叙事+世界观',
    durationMs: 45000,
    precacheEventId: 'char_create',
    narrationTech: '整个角色属性系统完全由AI驱动，每一个数值都会影响后续生成的内容方向',
    narrationExp: '我们设计了8个独立的世界，每个世界都有完整的叙事弧线和世界观设定',
  },
  {
    id: 'turn1',
    label: '第一回合',
    highlight: 'AI实时生成',
    durationMs: 40000,
    precacheEventId: 'turn_1',
    narrationTech: '系统将角色状态、世界设定、历史选择打包成结构化提示词发送给DeepSeek',
    narrationExp: 'AI会根据你的属性和之前的选择动态生成场景——每次玩都不一样',
  },
  {
    id: 'turn2',
    label: '第二回合',
    highlight: '玩法系统深度',
    durationMs: 40000,
    precacheEventId: 'turn_2',
    narrationTech: '我们实现了分层容错：API超时自动降级到本地模板引擎，保证体验不中断',
    narrationExp: '系统人格有4个进化阶段——它正从一个冷冰冰的程序变成你的伙伴',
  },
  {
    id: 'climax',
    label: '高潮',
    highlight: '叙事爆点',
    durationMs: 30000,
    precacheEventId: 'climax_reveal',
    narrationTech: '叙事系统包含8个世界×4幕×多个故事节点，总共超过200个手写叙事节点',
    narrationExp: '这个选择不是预设的——你会真实地影响后续世界的剧情走向',
  },
  {
    id: 'ending',
    label: '收尾',
    highlight: '留白引导',
    durationMs: 25000,
    precacheEventId: 'ending',
    narrationTech: '完整项目已生产构建就绪，支持离线模板回退，适配移动端',
    narrationExp: '这只是一个世界的冒险——完整游戏有8个世界、10个系统等待探索',
  },
];

/* ========== 演示开局完整参数 ========== */
export const DEMO_START_CONFIG = {
  player: DEMO_PLAYER,
  sceneId: DEMO_SCENE,
  systemId: DEMO_SYSTEM,
  phases: DEMO_PHASES,
};
