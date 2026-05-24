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
  gold: number;
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

export interface Artifact {
  id: string;
  name: string;
  type: 'growth_artifact';
  quality: 'legendary';
  abilities: string[];
  upgradeLevel: number;
  maxUpgradeLevel: number;
  cooldown: number;
  maxCooldown: number;
  description: string;
}

export interface MerchantOffer {
  item: Item | Artifact;
  price: number;
  negotiationDifficulty: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  type: 'active' | 'passive';
  effect: Record<string, number>;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'side' | 'daily' | 'hidden';
  difficulty: number;
  targetType: 'survive' | 'combat' | 'wealth' | 'level' | 'explore' | 'social';
  targetValue: number;
  targetRounds: number;
  progress: number;
  reward: {
    exp?: number;
    wealth?: number;
    items?: string[];
    systemExp?: number;
  };
  completed: boolean;
}

export interface CombatResult {
  enemyName: string;
  enemyLevel: number;
  playerDamage: number;
  enemyDamage: number;
  isVictory: boolean;
  isEscape: boolean;
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

export interface ImportantEvent {
  id: number;
  round: number;
  title: string;
  description: string;
  type: 'level_up' | 'achievement' | 'item' | 'combat' | 'talent' | 'story' | 'system' | 'scene';
  timestamp: number;
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
  activeTasks: Task[];
  completedTasks: string[];
  achievements: string[];
  history: HistoryEvent[];
  talents: Talent[];
  npcStatuses: Record<string, NpcStatus>;
  artifacts: Artifact[];
  systemHistory: SystemHistory;
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
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  choices: Choice[];
  type: 'normal' | 'random' | 'task' | 'story' | 'combat';
  npcInteractions?: NpcInteraction[];
}

export interface NpcInteraction {
  npcId: string;
  npcName: string;
  dialogue: string;
  playerResponse?: string;
}

export interface NpcStatus {
  id: string;
  name: string;
  alive: boolean;
  affection: number;
  location: string;
  flags: string[];
  firstMetRound: number;
}

export interface WorldShiftSignal {
  shouldShift: boolean;
  targetWorld: SceneType;
  shiftEventIdea: string;
}

export interface SystemHistory {
  checkInStreak: number;
  lastCheckInRound: number;
  lastRewardItemIds: string[];
  totalGoldIssued: number;
  artifactIssueHistory: { artifactId: string; issuedAtRound: number }[];
}

export type GameScreen = GameState['screen'];
