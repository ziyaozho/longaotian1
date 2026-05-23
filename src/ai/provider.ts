import type { AgentContext, GeneratedContent, SystemResponse } from '../agents/types';

export type ProviderType = 'deepseek' | 'ollama' | 'fallback';

export interface AIProvider {
  readonly type: ProviderType;
  readonly name: string;
  readonly isAvailable: boolean;

  generateScene(context: AgentContext): Promise<GeneratedContent>;
  generateEvent(context: AgentContext): Promise<GeneratedContent | null>;
  generateSystemMessage(context: AgentContext): Promise<SystemResponse>;
}

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}
