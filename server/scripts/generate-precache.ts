import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../src/demo/precache');
const OUT_FILE = resolve(OUT_DIR, 'demo_v1.json');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

function loadApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (key) return key;

  const envPath = resolve(__dirname, '../.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/DEEPSEEK_API_KEY\s*=\s*(.+)/);
    if (match) return match[1].trim();
  }

  throw new Error('DEEPSEEK_API_KEY not found. Set it in .env file or environment variable.');
}

interface PhasePrompt {
  id: string;
  label: string;
  systemPrompt: string;
  userPrompt: string;
}

const PHASES: PhasePrompt[] = [
  {
    id: 'char_create',
    label: '开局-角色创建',
    systemPrompt: '你是一个沉浸式修仙游戏的内容生成器。当前世界是"修仙世界"，玩家使用"吞噬进化"系统。请生成角色创建场景。只返回JSON格式数据。',
    userPrompt: `【角色创建场景】
玩家属性: 天赋9, 颜值6, 智力7, 体质6, 家世5, 运气7
等级: 1 | 生命值: 100/100 | 法力: 50/50

请生成:
1. 一个200字以内的开场场景描述，要有史诗感和沉浸感
2. 4个策略性选择，体现不同的修炼路径

严格返回JSON格式:
{
  "sceneText": "场景描述(200字以内)",
  "choices": [
    {"id": "c1", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c2", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c3", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c4", "text": "选择描述", "consequence": "可能后果"}
  ],
  "systemMessage": "系统消息(50字以内，带'叮！'前缀)"
}`,
  },
  {
    id: 'turn_1',
    label: '第一回合',
    systemPrompt: '你是一个沉浸式修仙游戏的内容生成器。当前世界是"修仙世界"，玩家使用"吞噬进化"系统。只返回JSON格式数据。',
    userPrompt: `【第一回合场景】
玩家属性: 天赋9, 颜值6, 智力7, 体质6, 家世5, 运气7
等级: 1 | 生命值: 100/100 | 法力: 50/50 | 财富: 500
历史: 刚踏入修仙世界，获得吞噬进化系统

请生成修仙世界的第一回合场景。要有灵气修炼的氛围，展现AI实时生成能力。
场景要包含4个策略性选择。

严格返回JSON格式:
{
  "sceneText": "场景描述(200字以内)",
  "choices": [
    {"id": "c1", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c2", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c3", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c4", "text": "选择描述", "consequence": "可能后果"}
  ],
  "systemMessage": "系统消息(50字以内)"
}`,
  },
  {
    id: 'turn_2',
    label: '第二回合',
    systemPrompt: '你是一个沉浸式修仙游戏的内容生成器。当前世界是"修仙世界"，玩家使用"吞噬进化"系统。展示玩法系统深度。只返回JSON格式数据。',
    userPrompt: `【第二回合场景】
玩家属性: 天赋9, 颜值6, 智力7, 体质6, 家世5, 运气7
等级: 2 | 生命值: 100/100 | 法力: 60/60 | 财富: 600
历史: 踏入修仙世界 -> 获得吞噬进化系统 -> 初次修炼

请生成第二回合场景。要包含吞噬进化系统的首次使用体验，展示玩法深度。
场景要包含4个选择，其中一个触发吞噬进化系统能力。

严格返回JSON格式:
{
  "sceneText": "场景描述(200字以内)",
  "choices": [
    {"id": "c1", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c2", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c3", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c4", "text": "选择描述", "consequence": "可能后果"}
  ],
  "systemMessage": "系统消息(50字以内)"
}`,
  },
  {
    id: 'climax_reveal',
    label: '高潮-叙事爆点',
    systemPrompt: '你是一个沉浸式修仙游戏的内容生成器。当前世界是"修仙世界"。生成高潮场景，揭示重大剧情转折。只返回JSON格式数据。',
    userPrompt: `【高潮场景】
玩家属性: 天赋9, 颜值6, 智力7, 体质6, 家世5, 运气7
等级: 3 | 生命值: 85/120 | 法力: 40/70 | 财富: 800
历史: 踏入修仙世界 -> 获得系统 -> 初次修炼 -> 吞噬第一只妖兽

请生成高潮场景。玩家在修炼中发现了一个隐藏的上古秘密——吞噬进化系统的真正来源。
这是一个剧情爆点，要有震撼感。

严格返回JSON格式:
{
  "sceneText": "场景描述(200字以内，要有震撼感)",
  "choices": [
    {"id": "c1", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c2", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c3", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c4", "text": "选择描述", "consequence": "可能后果"}
  ],
  "systemMessage": "系统消息(50字以内)"
}`,
  },
  {
    id: 'ending',
    label: '收尾',
    systemPrompt: '你是一个沉浸式修仙游戏的内容生成器。当前世界是"修仙世界"。生成收尾场景，留下余韵和探索欲望。只返回JSON格式数据。',
    userPrompt: `【收尾场景】
玩家属性: 天赋9, 颜值6, 智力7, 体质6, 家世5, 运气7
等级: 4 | 生命值: 90/130 | 法力: 55/80 | 财富: 1200
历史: 踏入修仙世界 -> 获得系统 -> 初次修炼 -> 吞噬妖兽 -> 发现上古秘密

请生成收尾场景。这是演示的最后一个场景，要点:
1. 给当前冒险一个阶段性的完结感
2. 暗示还有更多世界和系统等待探索
3. 保持叙事的沉浸感

严格返回JSON格式:
{
  "sceneText": "场景描述(200字以内，有余韵)",
  "choices": [
    {"id": "c1", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c2", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c3", "text": "选择描述", "consequence": "可能后果"},
    {"id": "c4", "text": "选择描述", "consequence": "可能后果"}
  ],
  "systemMessage": "系统消息(50字以内)"
}`,
  },
];

async function callDeepSeek(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
}

function parseResponse(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    sceneText: parsed.sceneText || '场景描述生成中...',
    event: null,
    choices: parsed.choices || [
      { id: 'c1', text: '继续冒险', consequence: '' },
      { id: 'c2', text: '探索周围', consequence: '' },
      { id: 'c3', text: '休息片刻', consequence: '' },
      { id: 'c4', text: '检查状态', consequence: '' },
    ],
    systemMessage: parsed.systemMessage || '系统运行中...',
    newTasks: [],
    newAchievements: [],
    achievementMessages: [],
    effects: { hpChange: 0, mpChange: 0, expGain: 10, wealthChange: 0, fameChange: 0, systemExpGain: 5 },
    usedFallback: false,
    combatResult: null,
    completedTasks: [],
    droppedItems: [],
  };
}

async function main() {
  const apiKey = loadApiKey();
  console.log(`API key loaded: ${apiKey.slice(0, 8)}...`);

  mkdirSync(OUT_DIR, { recursive: true });

  const events: Record<string, unknown> = {};

  for (const phase of PHASES) {
    console.log(`\n生成: ${phase.id} (${phase.label})...`);
    try {
      const raw = await callDeepSeek(phase.systemPrompt, phase.userPrompt, apiKey);
      events[phase.id] = parseResponse(raw);
      console.log(`  ✓ 完成`);
    } catch (e) {
      console.error(`  ✗ 失败:`, e);
      console.log(`  使用占位数据...`);
      events[phase.id] = {
        sceneText: `[${phase.label}] 演示内容生成中...\n\n这是一个预设的占位场景。运行 "pnpm run precache" 来预生成AI内容。`,
        event: null,
        choices: [
          { id: 'c1', text: '继续冒险', consequence: '' },
          { id: 'c2', text: '探索周围', consequence: '' },
          { id: 'c3', text: '休息片刻', consequence: '' },
          { id: 'c4', text: '检查状态', consequence: '' },
        ],
        systemMessage: '系统初始化中...',
        newTasks: [],
        newAchievements: [],
        achievementMessages: [],
        effects: { hpChange: 0, mpChange: 0, expGain: 10, wealthChange: 0, fameChange: 0, systemExpGain: 5 },
        usedFallback: false,
        combatResult: null,
        completedTasks: [],
        droppedItems: [],
      };
    }
  }

  const entry = {
    version: 'demo_v1',
    generatedAt: new Date().toISOString(),
    events,
  };

  writeFileSync(OUT_FILE, JSON.stringify(entry, null, 2), 'utf-8');
  console.log(`\n预缓存已生成: ${OUT_FILE}`);
  console.log(`共 ${Object.keys(events).length} 个事件`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
