import type { AIProvider, ProviderConfig } from './provider';
import type { AgentContext, GeneratedContent, SystemResponse } from '../agents/types';
import type { Choice } from '../types';
import { summarizeHistory } from './contextManager';
import { getLifeStage, getLifeStageDescription } from '../narrative/ageStages';
import { getActiveStoryNode } from '../narrative/sceneArcs';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

function buildScenePrompt(context: AgentContext): string {
  const { player, sceneName, sceneType } = context;
  const age = context.age;
  const attrText = Object.entries(player.attributes)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  // 装备描述
  const weaponText = player.equipment.weapon ? `手持【${player.equipment.weapon.name}】` : '';
  const armorText = player.equipment.armor ? `身穿【${player.equipment.armor.name}】` : '';
  const accessoryText = player.equipment.accessory ? `佩戴【${player.equipment.accessory.name}】` : '';
  const equipText = [weaponText, armorText, accessoryText].filter(Boolean).join('，');

  // 天赋描述
  const talentText = player.talents.length > 0
    ? player.talents.map(t => `${t.name}（${t.description}）`).join('；')
    : '';

  // 背包摘要（显示前5个有意义的物品）
  const inventorySummary = player.inventory.length > 0
    ? player.inventory.slice(0, 5).map(i => `【${i.name}】`).join('、') + (player.inventory.length > 5 ? `等${player.inventory.length}件物品` : '')
    : '空';

  // === 年龄阶段上下文 ===
  const lifeStageDesc = getLifeStageDescription(age, sceneType);
  const stage = getLifeStage(age);

  // === 叙事连续性上下文（扩展为最近5个事件） ===
  const recentEvents = player.storyMemory.recentEvents.slice(-5);
  const eventsText = recentEvents.length > 0
    ? recentEvents.map(e => `第${e.round}回合：${e.event}`).join('\n')
    : '无';

  const lastDecision = player.storyMemory.decisionLog.slice(-1);
  const decisionText = lastDecision.length > 0
    ? `第${lastDecision[0].round}回合选择了「${lastDecision[0].choice}」，结果是：${lastDecision[0].result}`
    : '尚未做出关键决策';

  const npcRelations = Object.entries(player.relationships);
  const relationText = npcRelations.length > 0
    ? npcRelations.map(([name, val]) => `${name}(${val > 0 ? '+' : ''}${val})`).join('，')
    : '暂无';

  const longTermSummary = player.storyMemory.longTermSummary || '故事刚刚开始';
  const location = player.worldState.currentLocation || sceneName;
  const timeline = player.worldState.timeline || '现在';

  // === 剧情节点上下文 ===
  const activeNode = getActiveStoryNode(sceneType, player.progress.sceneLevel, player.progress.storyFlags);
  const storyNodeText = activeNode
    ? `【当前剧情节点】
- 节点: ${activeNode.title}
- 描述: ${activeNode.description}
- 戏剧功能: ${activeNode.dramaticFunction}
${activeNode.choices && activeNode.choices.length > 0 ? `- 推荐选择选项（可参考但不必照搬）:
  ${activeNode.choices.map(c => `「${c.text}」(${c.shortTermConsequence})`).join('; ')}` : ''}
请在生成场景时参考这个剧情节点，但不要直接复制其文本。在合适的时机推动剧情向这个方向发展。`
    : '';

  return `你是一个沉浸式重生模拟器的场景生成器。每个回合代表角色一年的生活，请为这一年的最重要事件生成场景描述和4个选择。

【人生阶段】
${lifeStageDesc}

【场景信息】
- 场景名称: ${sceneName}
- 当前位置: ${location}
- 时间线: ${timeline}
- 回合: ${context.round}
- 年龄: ${age}岁（${stage.label}期）
- 玩家属性: ${attrText}
- 装备: ${equipText || '无'}
- 背包: ${inventorySummary}
- ${talentText ? `天赋: ${talentText}\n- ` : ''}等级: ${player.stats.level} | 生命值: ${player.stats.hp}/${player.stats.maxHp} | 财富: ${player.stats.wealth}

【最近事件】
${eventsText}

【上步决策】
${decisionText}

【NPC关系】
${relationText}

${storyNodeText ? storyNodeText + '\n' : ''}【故事主线】
${longTermSummary}

【历史摘要】
${summarizeHistory(context.history, 1500)}

【输出要求】
请严格返回以下JSON格式，不要包含其他文字:
{
  "sceneText": "100字左右的场景描述，简洁有画面感，必须体现这一年的核心事件，从上回合的结果自然延续",
  "choices": [
    {"id": "c1", "text": "选择1的简短描述", "consequence": "可能后果提示"},
    {"id": "c2", "text": "选择2的简短描述", "consequence": "可能后果提示"},
    {"id": "c3", "text": "选择3的简短描述", "consequence": "可能后果提示"},
    {"id": "c4", "text": "选择4的简短描述", "consequence": "可能后果提示"}
  ],
  "npcMentions": []
}

注意：
1. 场景要与"${sceneName}"的世界观一致
2. 选择要有策略性，体现不同风险偏好，且每个选择的结果不能重复
3. ★★★ 年龄和人生阶段会影响你面临的问题和选择。${stage.stage === 'elder' ? '你已年老体衰，选项应体现迟暮之年的特点（如传承、告别、反思），不宜再有年少轻狂的冒险选项。' : stage.stage === 'childhood' ? '你尚年少，选项应体现成长初期的特点（如学习、锻炼、探索），不宜有老成持重的选项。' : ''}
4. 如果玩家生命值低，可以加入疗伤相关选项
5. ★★★ 如果玩家获得物品，必须在consequence中用【物品全名】标出，不能遗漏。例如：consequence写"获得【小还丹】，恢复了部分生命值"。如果有多个物品，每个都要用【】包起来
6. 如果文本中提到某个NPC，在npcMentions中包含其名字
7. 所有输出必须是中文
8. ★★★ 核心规则：每回合代表角色一年的生活，场景必须是这一年的最重要事件。每回合必须从上回合的结果自然延续，不能跳转或重置场景。每回合都要推动故事向前发展，不能重复相似的场景描写。禁止重新介绍场景或从头描述。跳过那些平淡无奇的年份，只呈现有意义的转折、抉择和成长时刻。
	9. ★★★ 使用道具的选项最多只能有1个，且只有背包中有该道具时才应该出现。选项应多元化：探索、社交、战斗、修炼等不同类型各一个，不要集中在道具使用上。`;
}

function buildEventPrompt(context: AgentContext): string {
  const { player, sceneName, round, age, sceneType } = context;

  const recentEvents = player.storyMemory.recentEvents.slice(-3);
  const lastEventText = recentEvents.length > 0
    ? recentEvents.map(e => `第${e.round}回合：${e.event}`).join('\n')
    : '无最近事件';

  const stage = getLifeStage(age);

  return `你是一个重生模拟器的随机事件生成器。请为以下玩家生成一个突发事件。

【场景信息】
- 场景: ${sceneName}
- 回合: ${round}
- 年龄: ${age}岁（${stage.label}期）
- 玩家等级: ${player.stats.level}
- 最近事件:
${lastEventText}

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

注意：
- 事件要有戏剧性和意外感，与场景世界观一致
- 事件内容要符合玩家的年龄阶段（${stage.label}期：${stage.theme}）
- 事件不能重复最近事件的剧情
- 如果玩家能在事件中获得物品，在对应choice的consequence中用【物品全名】标出
- 中文输出。`;
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
    // 清理 markdown 代码块标记
    let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 尝试从文本中提取第一个 { } JSON 块
    const braceMatch = cleaned.match(/\{[\s\S]*\}/);
    if (braceMatch) cleaned = braceMatch[0];

    const tryParse = (s: string): T | null => {
      try { return JSON.parse(s) as T; } catch { return null; }
    };

    // Level 1: 直接解析
    let result = tryParse(cleaned);
    if (result) return result;

    // Level 2: 移除尾随逗号后重试
    const fixed = cleaned.replace(/,\s*([}\]])/g, '$1');
    result = tryParse(fixed);
    if (result) return result;

    // Level 3: 补齐截断的 JSON（缺少尾部括号）
    const openers = [...fixed].filter(c => c === '{' || c === '[').length;
    const closers = [...fixed].filter(c => c === '}' || c === ']').length;
    if (openers > closers) {
      const tail = ']}'.repeat(openers - closers);
      result = tryParse(fixed + tail);
      if (result) return result;
    }

    // 全部失败，抛出异常以便外层走到 fallback
    throw new SyntaxError(`JSON 解析失败:\n${cleaned.slice(0, 200)}`);
  }

  // ========== 3 级容错调用 ==========
  // Level 1: SSE 流式 → Level 2: 非流式重试 → Level 3: 本地模板

  private async sceneWithFallback(raw: string): Promise<GeneratedContent> {
    const data = this.parseJSON<{ sceneText: string; choices: Choice[]; npcMentions?: string[] }>(raw);
    return { text: data.sceneText, choices: data.choices, effects: {}, npcMentions: data.npcMentions || [] };
  }

  async generateScene(context: AgentContext): Promise<GeneratedContent> {
    const prompt = buildScenePrompt(context);

    try {
      const raw = await withRetry(() => this.callAPIStream(prompt), { maxRetries: 1, baseDelay: 500 });
      return this.sceneWithFallback(raw);
    } catch (e) {
      console.warn('[AI] 流式生成失败，尝试非流式:', e);
    }

    try {
      const raw = await withRetry(() => this.callAPI(prompt), { maxRetries: 3, baseDelay: 1000 });
      return this.sceneWithFallback(raw);
    } catch (e) {
      console.error('[AI] 所有 API 调用失败，向上抛出:', e);
      throw e;
    }
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
      console.error('[AI] 事件生成 API 失败，向上抛出:', e);
      throw e;
    }
  }

  async generateSystemMessage(context: AgentContext): Promise<SystemResponse> {
    const prompt = buildSystemPrompt(context);

    try {
      const raw = await withRetry(() => this.callAPIStream(prompt), { maxRetries: 1, baseDelay: 500 });
      const data = this.parseJSON<{ message: string; type: SystemResponse['type']; rewards?: SystemResponse['rewards'] }>(raw);
      return { message: data.message, type: data.type || 'info', rewards: data.rewards };
    } catch (e) {
      console.warn('[AI] 系统消息流式生成失败，尝试非流式:', e);
    }

    try {
      const raw = await withRetry(() => this.callAPI(prompt), { maxRetries: 3, baseDelay: 1000 });
      const data = this.parseJSON<{ message: string; type: SystemResponse['type']; rewards?: SystemResponse['rewards'] }>(raw);
      return { message: data.message, type: data.type || 'info', rewards: data.rewards };
    } catch (e) {
      console.error('[AI] 系统消息生成 API 全部失败，向上抛出:', e);
      throw e;
    }
  }
}
