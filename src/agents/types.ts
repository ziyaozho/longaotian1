import type { Player, Choice, SceneType, EndingDefinition } from '../types';

// ============================================================
// 多智能体架构 —— 角色与消息协议
// ============================================================

/** 智能体角色 */
export type AgentRole =
  | 'coordinator'
  | 'worldGuide'
  | 'storyWeaver'
  | 'endingWatcher'
  | 'memoryKeeper'
  | 'truthSeer'
  | 'personaActor';

/** 智能体间通信消息 */
export interface AgentMessage<T = unknown> {
  from: AgentRole;
  to: AgentRole;
  type: 'request' | 'response' | 'error';
  payload: T;
  correlationId: string;
}

// ============================================================
// 世界导引师 (World Guide) §2
// ============================================================

export interface WorldRecommendation {
  recommendedWorld: string;
  reason: string;
  invitationText: string;
  alternativeWorlds: string[];
}

export interface WorldShiftEvaluation {
  shouldShift: boolean;
  targetWorld?: string;
  shiftEventIdea?: string;
  fitnessScores: Record<string, number>;
}

// ============================================================
// 剧情编织者 (Story Weaver) §3.3
// ============================================================

export interface StoryWeaverInput {
  worldSetting: string;
  systemPersonality: string;
  longTermSummary: string;
  lastEvents: string;
  playerState: string;
  npcContext: string;
  endingHint: string;
  worldShiftSignal?: string;
  playerChoice?: string;
}

export interface StoryWeaverOutput {
  sceneDescription: string;
  systemDialogue: string;
  npcInteractions: string;
  playerChoices: Choice[];
  attributeChanges: Record<string, number>;
  newEvents: string[];
  narrativeHook: string;
  rawText: string; // AI 返回的原始文本
}

// ============================================================
// 结局守望者 (Ending Watcher) §3.2, §5
// ============================================================

export interface EndingEvaluation {
  conditionProgress: Record<string, number>;
  overallFeasibility: number;
  isStillPossible: boolean;
  narrativeHint: string;
}

export interface ConditionMutation {
  canMutate: boolean;
  newCondition?: string;
  newHint?: string;
}

export interface DynamicEndingPrototype {
  endingId: string;
  name: string;
  description: string;
  conditions: string[];
  generatedAt: number; // 生成时的时间戳
}

// ============================================================
// 记忆守护者 (Memory Keeper) §3.1
// ============================================================

export interface MemoryCompressionInput {
  shortTermEvents: Array<{ round: number; event: string }>;
  longTermSummary: string;
  existingFlags: string[];
}

export interface MemoryCompressionOutput {
  summaryDelta: string;
  updatedFlags: string[];
}

// ============================================================
// 真实之眼 (Truth Seer) §3.4
// ============================================================

export interface TruthSeerValidation {
  accepted: boolean;
  issues: string[];
  retriesUsed: number;
  correctedOutput?: StoryWeaverOutput;
}

// ============================================================
// 性格演员 (Persona Actor) §3.5
// ============================================================

export interface PersonaActorInput {
  systemName: string;
  personality: string;
  sceneContext: string;
  eventSummary: string;
  memeHints: string[];
}

// ============================================================
// 兼容旧接口 (逐步弃用)
// ============================================================

/** @deprecated 使用 StoryWeaverInput 替代 */
export interface AgentContext {
  player: Player;
  sceneType: SceneType;
  sceneName: string;
  round: number;
  age: number;
  history: string[];
}

/** @deprecated 使用 StoryWeaverOutput 替代 */
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
  npcMentions?: string[];
  storyFlags?: string[];
}

/** @deprecated 由剧情编织者一并生成 */
export interface SystemResponse {
  message: string;
  type: 'info' | 'reward' | 'upgrade' | 'warning';
  rewards?: {
    exp?: number;
    wealth?: number;
    systemExp?: number;
  };
}

/** @deprecated 由协调器管理 */
export type { EndingDefinition };

export interface AgentPrompt {
  role: AgentRole;
  context: AgentContext;
  additionalInfo?: Record<string, unknown>;
}
