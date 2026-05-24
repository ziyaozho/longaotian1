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

  async generateNarrative(_prompt: string): Promise<string> {
    return JSON.stringify({
      sceneDescription: '你继续在这片土地上冒险，周围充满了未知的机遇与挑战。',
      systemDialogue: '叮！系统运行正常。',
      npcInteractions: [],
      playerChoices: [
        { id: 'c1', text: '探索前方', consequence: '可能发现新区域' },
        { id: 'c2', text: '修炼提升', consequence: '稳步增长实力' },
        { id: 'c3', text: '搜寻资源', consequence: '获得物资补给' },
        { id: 'c4', text: '休息恢复', consequence: '恢复部分生命值' },
      ],
      attributeChanges: {},
      newEvents: ['继续冒险'],
      narrativeHook: '前方的道路充满未知...',
    });
  }

  async generateLight(_prompt: string, _maxTokens?: number): Promise<string> {
    return '{}';
  }
}
