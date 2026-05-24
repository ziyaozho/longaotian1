export type SceneType =
  | 'modern_city'
  | 'cultivation'
  | 'urban_fantasy'
  | 'apocalypse'
  | 'apoc_fantasy'
  | 'hidden_immortal'
  | 'hidden_cyber'
  | 'hidden_demon';

export type TalentCategory = 'combat' | 'magic' | 'body' | 'mind' | 'social' | 'craft' | 'luck';
export type TalentRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface TalentEffect {
  attrBonus?: Partial<Attributes>;
  statBonus?: Partial<Stats>;
  skillUnlock?: string;
  damageType?: string;
  conditionalBonus?: { condition: string; bonus: TalentEffect };
}

export interface Talent {
  id: string;
  name: string;
  description: string;
  category: TalentCategory;
  worldTheme: SceneType;
  rarity: TalentRarity;
  effects: TalentEffect;
  synergyTags: string[];
}

export interface SynergyLink {
  talentA: string;
  talentB: string;
  commonTags: string[];
  strength: 'weak' | 'strong' | 'legendary';
  comboName: string;
}

export interface Attributes {
  talent: number;
  appearance: number;
  intelligence: number;
  physique: number;
  family: number;
  luck: number;
}

export interface Stats {
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  combatPower: number;
  wealth: number;
  fame: number;
}

export interface PlayerSystem {
  id: string;
  name: string;
  level: number;
  exp: number;
  features: string[];
}

export interface Progress {
  sceneType: SceneType;
  sceneLevel: number;
  round: number;
  age: number;
  storyFlags: string[];
}

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'skill_book';
  effect?: Record<string, number>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  type: 'active' | 'passive';
  effect: Record<string, number>;
}

export interface CombatResult {
  enemyName: string;
  enemyLevel: number;
  playerDamage: number;
  enemyDamage: number;
  isVictory: boolean;
  isEscape: boolean;
  defeatReason?: string; // 战力碾压却战败时的叙事理由
  loot: {
    exp: number;
    wealth: number;
    item?: string;
  };
}

export interface HistoryEvent {
  round: number;
  age: number;
  description: string;
  type: 'scene' | 'event' | 'choice' | 'combat' | 'achievement';
}

export interface Equipment {
  weapon?: Item;
  armor?: Item;
  accessory?: Item;
}

export interface Player {
  id: string;
  name: string;
  createdAt: number;
  attributes: Attributes;
  stats: Stats;
  system: PlayerSystem;
  progress: Progress;
  inventory: Item[];
  equipment: Equipment;
  skills: Skill[];
  achievements: string[];
  history: HistoryEvent[];
  talents: Talent[];

  // ===== ending.md.txt 新增状态 =====
  npcs: NPCState[];
  relationships: Record<string, number>;
  storyMemory: StoryMemory;
  worldState: WorldState;
  extendedSystem: ExtendedSystemState;
  endingProgress: EndingProgress;
}

export interface SceneDefinition {
  id: SceneType;
  name: string;
  description: string;
  difficulty: number;
  maxAge: number;
  unlockRequirement?: string;
  attributeModifiers: Partial<Attributes>;
  specialRules: string[];
  stylePrompt: string;
  realmNames: string[];
}

export interface GameState {
  screen: 'start' | 'create' | 'scene_select' | 'system_select' | 'game' | 'game_over' | 'achievements';
  isLoading: boolean;
  currentScene: string;
  currentChoices: Choice[];
  currentEvent: GameEvent | null;
  systemMessage: string | null;
  newAchievements: string[];
  logs: string[];
}

export interface Choice {
  id: string;
  text: string;
  consequence?: string;
  requiredAttribute?: { attr: keyof Attributes; min: number };
  rewardTalent?: string;
  relationshipDelta?: number; // NPC邂逅时关系值变化
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: Choice[];
  type: 'normal' | 'random' | 'task' | 'story' | 'combat';
}

export type GameScreen = GameState['screen'];

// ============================================================
// ending.md.txt 核心机制 —— 状态扩展
// ============================================================

/** NPC 数据模型 (ending.md §6.1) */
export interface NPCState {
  npcId: string;
  name: string;
  role: string;
  personality: string;
  relationship: number; // -100 ~ 100
  memoryOfPlayer: string[]; // 保留最近 5 条关键记忆
  currentGoal: string;
  currentStatus: string;
  dialogueStyle: string;
  isAlive: boolean;
  firstMetRound: number;
}

/** 故事记忆 (ending.md §3.1) */
export interface StoryMemory {
  longTermSummary: string; // 替代冗长历史的压缩摘要
  recentEvents: Array<{ round: number; event: string }>;
  decisionLog: Array<{ round: number; choice: string; result: string }>;
}

/** 世界状态 (ending.md §3.1) */
export interface WorldState {
  currentLocation: string;
  timeline: string;
  globalFlags: Record<string, boolean>;
}

/** 系统扩展状态 (ending.md §3.1) */
export interface ExtendedSystemState {
  checkInStreak?: number;
  nextRewardTier?: string;
  dialogueStyle: string; // 毒舌/温柔/高冷/搞怪等
  [key: string]: unknown;
}

/** 结局定义 (ending.md §4.1) */
export interface EndingDefinition {
  endingId: string;
  name: string;
  description: string;
  victoryConditions: string[];
  failConditions: string[];
  tone: string;
}

/** 结局进度 */
export interface EndingProgress {
  targetEndingId: string;
  conditionStatus: Record<string, boolean | number>;
  isFailed: boolean;
}
