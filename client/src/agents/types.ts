import type { Player, Choice, SceneType, Attributes, NpcInteraction, NpcStatus, WorldShiftSignal, Item, Artifact } from '../types';

export interface AgentContext {
  player: Player;
  sceneType: SceneType;
  sceneName: string;
  round: number;
  age: number;
  history: string[];
}

export interface GeneratedContent {
  text: string;
  choices: Choice[];
  effects?: {
    hpChange?: number;
    mpChange?: number;
    expGain?: number;
    wealthChange?: number;
    fameChange?: number;
    itemDrop?: string[];
  };
  storyFlags?: string[];
}

export interface SystemResponse {
  message: string;
  type: 'info' | 'reward' | 'upgrade' | 'warning';
  rewards?: {
    exp?: number;
    wealth?: number;
    systemExp?: number;
  };
}

export type AgentRole = 'scene' | 'event' | 'story' | 'task' | 'system';

export interface AgentPrompt {
  role: AgentRole;
  context: AgentContext;
  additionalInfo?: Record<string, unknown>;
}

// ============================================================
// 多智能体系统类型
// ============================================================

/** 短期记忆条目 */
export interface ShortTermMemory {
  round: number;
  event: string;
}

/** 记忆守护者维护的记忆状态 */
export interface MemoryState {
  shortTerm: ShortTermMemory[];
  longTermSummary: string;
  importantFlags: string[];
}

/** 记忆压缩输出 */
export interface MemoryCompressionResult {
  summaryDelta: string;
  updatedFlags: string[];
}

/** 结局条件 */
export interface EndingCondition {
  id: string;
  description: string;
  type: 'attribute' | 'event' | 'collection' | 'social' | 'artifact';
  targetAttribute?: keyof Attributes;
  targetValue?: number;
  eventDescription?: string;
  itemType?: string;
  requiredCount?: number;
  targetArtifactId?: string;
  targetUpgradeLevel?: number;
  progress: number;
  isStillPossible: boolean;
}

/** 结局原型 */
export interface EndingPrototype {
  endingId: string;
  name: string;
  description: string;
  conditions: EndingCondition[];
  overallFeasibility: number;
  isStillPossible: boolean;
}

/** 结局评估输出 */
export interface EndingEvaluation {
  conditionProgress: Record<string, number>;
  overallFeasibility: number;
  isStillPossible: boolean;
  narrativeHint: string;
}

/** 世界推荐输出 */
export interface WorldRecommendation {
  recommendedWorld: SceneType;
  reason: string;
  invitationText: string;
  alternativeWorlds: SceneType[];
}

/** 世界契合度评分 */
export interface WorldFitnessScore {
  world: SceneType;
  score: number;
}

/** 叙事上下文（组装给剧情编织者的完整输入） */
export interface NarrativeContext {
  worldSetting: string;
  systemPersonality: string;
  longTermSummary: string;
  recentEvents: ShortTermMemory[];
  player: Player;
  npcStatuses: Record<string, NpcStatus>;
  endingHint: string;
  worldShiftSignal: WorldShiftSignal | null;
  playerChoice?: string;
  economicState: EconomicState;
  artifactHints: ArtifactUsageHint[];
}

/** 剧情编织者输出 */
export interface StoryWeaverOutput {
  sceneDescription: string;
  systemDialogue: string;
  npcInteractions: NpcInteraction[];
  playerChoices: Choice[];
  attributeChanges: Partial<Attributes>;
  newEvents: string[];
  narrativeHook: string;
}

/** 真实之眼校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** 经济状态（注入到剧情编织者） */
export interface EconomicState {
  gold: number;
  tradableItems: { name: string; type: string; estimatedValue: number }[];
}

/** 道具使用提示 */
export interface ArtifactUsageHint {
  artifactId: string;
  artifactName: string;
  ability: string;
  unusedRounds: number;
  suggestedScene: string;
}

/** 系统性格配置 */
export interface SystemPersona {
  name: string;
  personality: string;
  catchphrase: string;
  memeStyle: 'roast' | 'hype' | 'heartfelt' | 'daily';
}

// ============================================================
// 系统智能体类型
// ============================================================

/** 签到品质等级 */
export type CheckInQuality = 'common' | 'epic' | 'legendary' | 'mythic';

/** 系统奖励条目 */
export interface SystemReward {
  type: 'gold' | 'item' | 'artifact' | 'attribute' | 'exp';
  amount?: number;
  item?: Item;
  artifact?: Artifact;
  attribute?: Partial<Attributes>;
  description: string;
}

/** 签到结果 */
export interface CheckInResult {
  canCheckIn: boolean;
  streak: number;
  quality: CheckInQuality;
  rewards: SystemReward[];
  dialogue: string;
  storyHook?: string;
}

/** 任务进度更新 */
export interface TaskProgressUpdate {
  taskId: string;
  newProgress: number;
  isCompleted: boolean;
}
