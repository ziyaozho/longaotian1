import type { AIProvider, ProviderConfig } from './provider';
import type { AgentContext, GeneratedContent, SystemResponse } from '../agents/types';
import type { Choice } from '../types';
import { summarizeHistory } from './contextManager';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

function buildScenePrompt(context: AgentContext): string {
  const { player, sceneName } = context;
  const attrText = Object.entries(player.attributes)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  return `你是一个沉浸式重生模拟器的场景生成器。请根据以下玩家状态生成一个引人入胜的场景描述和4个选择。

【场景信息】
- 场景名称: ${sceneName}
- 回合: ${context.round}
- 年龄: ${context.age}岁
- 玩家属性: ${attrText}
- 等级: ${player.stats.level} | 生命值: ${player.stats.hp}/${player.stats.maxHp} | 财富: ${player.stats.wealth}
- 历史摘要: ${summarizeHistory(context.history, 1500)}

【输出要求】
请严格返回以下JSON格式，不要包含其他文字:
{
  "sceneText": "200字以内的场景描述，要有画面感和沉浸感",
  "choices": [
    {"id": "c1", "text": "选择1的简短描述", "consequence": "可能后果提示"},
    {"id": "c2", "text": "选择2的简短描述", "consequence": "可能后果提示"},
    {"id": "c3", "text": "选择3的简短描述", "consequence": "可能后果提示"},
    {"id": "c4", "text": "选择4的简短描述", "consequence": "可能后果提示"}
  ]
}

注意：
1. 场景要与"${sceneName}"的世界观一致
2. 选择要有策略性，体现不同风险偏好
3. 如果玩家生命值低，可以加入疗伤相关选项
4. 所有输出必须是中文`;
}

function buildEventPrompt(context: AgentContext): string {
  const { player, sceneName, round } = context;
  return `你是一个重生模拟器的随机事件生成器。请为以下玩家生成一个突发事件。

【场景信息】
- 场景: ${sceneName}
- 回合: ${round}
- 玩家等级: ${player.stats.level}

【输出要求】
严格返回JSON格式:
{
  "title": "事件标题(10字以内)",
  "description": "事件描述(100字以内)",
  "choices": [
    {"id": "e1", "text": "选择1"},
    {"id": "e2", "text": "选择2"},
    {"id": "e3", "text": "选择3"}
  ]
}

如果不需要生成事件，返回: {"event": null}

注意：事件要有戏剧性和意外感，与场景世界观一致。中文输出。`;
}

function buildSystemPrompt(context: AgentContext): string {
  const { player } = context;
  const sysName = player.system.name;
  return `你是一个系统消息生成器，扮演"${sysName}"系统向玩家发送消息。

【玩家状态】
- 系统等级: ${player.system.level}
- 系统经验: ${player.system.exp}
- 玩家等级: ${player.stats.level}

【输出要求】
严格返回JSON格式:
{
  "message": "系统消息内容(50字以内，带\"叮！\"前缀)",
  "type": "info" | "reward" | "upgrade" | "warning",
  "rewards": {
    "exp": 数字或0,
    "wealth": 数字或0,
    "systemExp": 数字或0
  }
}

注意：消息要有系统感，类似网文中金手指系统的提示。中文输出。`;
}

// ========== 重试工具 ==========

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}

// ========== DeepSeek Provider ==========

export class DeepSeekProvider implements AIProvider {
  readonly type = 'deepseek' as const;
  readonly name = 'DeepSeek AI';
  readonly isAvailable: boolean;

  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || DEEPSEEK_API_URL;
    this.model = config.model || DEFAULT_MODEL;
    this.timeout = config.timeout || 15000;
    this.isAvailable = !!this.apiKey;
  }

  // ========== 非流式调用 ==========

  private async callAPI(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: '你是一个游戏内容生成器，只返回JSON格式数据。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} ${err}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  // ========== SSE 流式调用 ==========

  private async callAPIStream(prompt: string): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: '你是一个游戏内容生成器，只返回JSON格式数据。' },
          { role: 'user', content: prompt },
        ],
        stream: true,
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) fullText += content;
        } catch {
          // skip unparseable lines
        }
      }
    }

    return fullText;
  }

  private parseJSON<T>(text: string): T {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned) as T;
  }

  // ========== 3 级容错调用 ==========
  // Level 1: SSE 流式 → Level 2: 非流式重试 → Level 3: 本地模板

  private async sceneWithFallback(raw: string): Promise<GeneratedContent> {
    const data = this.parseJSON<{ sceneText: string; choices: Choice[] }>(raw);
    return { text: data.sceneText, choices: data.choices, effects: {} };
  }

  async generateScene(context: AgentContext): Promise<GeneratedContent> {
    const prompt = buildScenePrompt(context);

    const localFallback: GeneratedContent = {
      text: `${context.sceneName}的第${context.round}回合。\n你继续在这片土地上冒险，周围充满了未知的机遇与挑战。`,
      choices: [
        { id: 'c1', text: '探索前方', consequence: '可能发现新区域' },
        { id: 'c2', text: '修炼提升', consequence: '稳步增长实力' },
        { id: 'c3', text: '搜寻资源', consequence: '获得物资补给' },
        { id: 'c4', text: '休息恢复', consequence: '恢复部分生命值' },
      ],
      effects: { expGain: 5 },
    };

    try {
      const raw = await withRetry(() => this.callAPIStream(prompt), { maxRetries: 1, baseDelay: 500 });
      return this.sceneWithFallback(raw);
    } catch (e) {
      console.warn('Streaming failed, falling back to non-streaming:', e);
    }

    try {
      const raw = await withRetry(() => this.callAPI(prompt), { maxRetries: 3, baseDelay: 1000 });
      return this.sceneWithFallback(raw);
    } catch (e) {
      console.warn('Non-streaming failed, falling back to local templates:', e);
    }

    return localFallback;
  }

  async generateEvent(context: AgentContext): Promise<GeneratedContent | null> {
    if (Math.random() > 0.4) return null;

    const prompt = buildEventPrompt(context);

    try {
      const raw = await withRetry(() => this.callAPIStream(prompt), { maxRetries: 1, baseDelay: 500 });
      const data = this.parseJSON<{ title: string; description: string; choices: Choice[] }>(raw);
      return { text: data.description, choices: data.choices, effects: {} };
    } catch (e) {
      console.warn('Streaming event failed, trying non-streaming:', e);
    }

    try {
      const raw = await withRetry(() => this.callAPI(prompt), { maxRetries: 3, baseDelay: 1000 });
      const data = this.parseJSON<{ title: string; description: string; choices: Choice[] }>(raw);
      return { text: data.description, choices: data.choices, effects: {} };
    } catch (e) {
      console.warn('Non-streaming event failed, using fallback:', e);
    }

    return null;
  }

  async generateSystemMessage(context: AgentContext): Promise<SystemResponse> {
    const prompt = buildSystemPrompt(context);

    const localFallback: SystemResponse = {
      message: `叮！${context.player.system.name}系统运行正常。`,
      type: 'info',
    };

    try {
      const raw = await withRetry(() => this.callAPIStream(prompt), { maxRetries: 1, baseDelay: 500 });
      const data = this.parseJSON<{ message: string; type: SystemResponse['type']; rewards?: SystemResponse['rewards'] }>(raw);
      return { message: data.message, type: data.type || 'info', rewards: data.rewards };
    } catch (e) {
      console.warn('Streaming system message failed, trying non-streaming:', e);
    }

    try {
      const raw = await withRetry(() => this.callAPI(prompt), { maxRetries: 3, baseDelay: 1000 });
      const data = this.parseJSON<{ message: string; type: SystemResponse['type']; rewards?: SystemResponse['rewards'] }>(raw);
      return { message: data.message, type: data.type || 'info', rewards: data.rewards };
    } catch (e) {
      console.warn('Non-streaming system message failed, using fallback:', e);
    }

    return localFallback;
  }
}
