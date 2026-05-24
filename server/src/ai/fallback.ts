import type { AIProvider } from './provider';
import type { AgentContext, GeneratedContent, SystemResponse } from '../agents/types';
import {
  generateSceneContent,
  generateEvent,
  generateSystemMessage,
} from '../agents/contentGenerator';

export class FallbackProvider implements AIProvider {
  readonly type = 'fallback' as const;
  readonly name = '本地模板';
  readonly isAvailable = true;

  async generateScene(context: AgentContext): Promise<GeneratedContent> {
    return generateSceneContent(context);
  }

  async generateEvent(context: AgentContext): Promise<GeneratedContent | null> {
    return generateEvent(context);
  }

  async generateSystemMessage(context: AgentContext): Promise<SystemResponse> {
    return generateSystemMessage(context);
  }
}
