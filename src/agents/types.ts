import type { Player, Choice, SceneType } from '../types';

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
