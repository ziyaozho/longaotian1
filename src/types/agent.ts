import type { Player, GameEvent, Choice, Task } from './game';

export interface AgentInput {
  player: Player;
  context?: Record<string, unknown>;
}

export interface SceneAgentOutput {
  sceneDescription: string;
  atmosphere: string;
  choices: Choice[];
  environmentalEffects?: string[];
}

export interface TaskAgentOutput {
  tasks: Task[];
  systemMessage?: string;
}

export interface StoryAgentOutput {
  storyText: string;
  plotDevelopment: string;
  npcDialogues?: Record<string, string>;
  storyFlags?: string[];
}

export interface EventAgentOutput {
  event: GameEvent;
  probability: number;
  isTriggered: boolean;
}

export interface SystemAgentOutput {
  message: string;
  upgradeNotification?: {
    oldLevel: number;
    newLevel: number;
    newFeatures: string[];
  };
  rewards?: {
    exp?: number;
    wealth?: number;
    items?: string[];
  };
}

export interface AchievementAgentOutput {
  newAchievements: string[];
  messages: string[];
}

export interface AgentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type AgentType = 'scene' | 'task' | 'story' | 'event' | 'system' | 'achievement';

export interface AgentConfig {
  type: AgentType;
  prompt: string;
  temperature: number;
  maxTokens: number;
}
