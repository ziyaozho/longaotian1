import type { AgentContext, GeneratedContent, SystemResponse } from '../agents/types';

export type ProviderType = 'deepseek' | 'ollama' | 'fallback';

export interface AIProvider {
  readonly type: ProviderType;
  readonly name: string;
  readonly isAvailable: boolean;

  generateScene(context: AgentContext): Promise<GeneratedContent>;
  generateEvent(context: AgentContext): Promise<GeneratedContent | null>;
  generateSystemMessage(context: AgentContext): Promise<SystemResponse>;

  /** 通用叙事生成（供StoryWeaver使用） */
  generateNarrative(prompt: string): Promise<string>;

  /** 轻量调用（供非核心智能体使用，token限制严格） */
  generateLight(prompt: string, maxTokens?: number): Promise<string>;
}

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}
