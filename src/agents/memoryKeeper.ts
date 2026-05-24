import type { StoryMemory } from '../types';
import type { MemoryCompressionInput, MemoryCompressionOutput } from './types';
import {
import { DEEPSEEK_API_KEY } from '../ai';
  compressRecentEvents,
  fallbackSummarize,
  trimLongTermSummary,
} from '../engine/memoryCompression';

const COMPRESSION_THRESHOLD = 8;
const KEEP_AFTER_COMPRESSION = 2;
const MAX_SUMMARY_LENGTH = 500;

/**
 * 记忆守护者 (Memory Keeper) §3.1
 * 包装 memoryCompression 引擎，添加重要标志提取
 */
export async function compressMemory(
  input: MemoryCompressionInput,
  useAI: boolean = true
): Promise<MemoryCompressionOutput> {
  const { shortTermEvents, longTermSummary, existingFlags } = input;

  if (shortTermEvents.length < COMPRESSION_THRESHOLD) {
    return { summaryDelta: '', updatedFlags: existingFlags };
  }

  const eventsToCompress = shortTermEvents.slice(0, -KEEP_AFTER_COMPRESSION);

  let summaryDelta: string;
  if (useAI) {
    try {
      summaryDelta = await aiCompressMemory(eventsToCompress, longTermSummary);
    } catch {
      summaryDelta = fallbackSummarize(eventsToCompress);
    }
  } else {
    summaryDelta = fallbackSummarize(eventsToCompress);
  }

  // 提取重要标志（降级方案：基于关键词检测）
  const updatedFlags = extractFlagsLocal(eventsToCompress, existingFlags);

  return { summaryDelta, updatedFlags };
}

/**
 * AI 压缩记忆
 */
async function aiCompressMemory(
  events: Array<{ round: number; event: string }>,
  longTermSummary: string
): Promise<string> {
  const eventsText = events.map((e) => `第${e.round}回合：${e.event}`).join('\n');

  const prompt = `将以下近期游戏事件压缩为一段剧情摘要（100字内），保留关键因果、人物关系变化和重要伏笔。摘要将被追加到长期剧情总结中。
【近期事件】
${eventsText}
【当前长期总结】
${longTermSummary || '无'}

输出JSON：
{
  "summary_delta": "本段新增的摘要，直接连接在前文之后",
  "updated_flags": ["需标记的新重要标志"]
}
只输出JSON`;

  if (!DEEPSEEK_API_KEY) throw new Error('No API key');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 200,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed.summary_delta || fallbackSummarize(events);
  } catch {
    return fallbackSummarize(events);
  }
}

/**
 * 本地标志提取（基于关键词）
 */
function extractFlagsLocal(
  events: Array<{ round: number; event: string }>,
  existingFlags: string[]
): string[] {
  const keywordMap: Record<string, string[]> = {
    '系统激活': ['system_activated', 'first_system'],
    '好感': ['relationship_changed'],
    '死亡': ['npc_died', 'character_death'],
    '突破': ['breakthrough'],
    '获得.*传说': ['legendary_acquired'],
    '世界.*转换': ['world_shifted'],
  };

  const newFlags: string[] = [...existingFlags];

  for (const event of events) {
    for (const [pattern, flags] of Object.entries(keywordMap)) {
      if (event.event.includes(pattern)) {
        for (const flag of flags) {
          if (!newFlags.includes(flag)) {
            newFlags.push(flag);
          }
        }
      }
    }
  }

  return newFlags;
}

/**
 * 应用记忆压缩到 StoryMemory
 */
export function applyCompression(
  memory: StoryMemory,
  output: MemoryCompressionOutput,
  eventsToKeep: Array<{ round: number; event: string }>
): StoryMemory {
  const newLongTerm = memory.longTermSummary
    ? `${memory.longTermSummary} ${output.summaryDelta}`
    : output.summaryDelta;

  return {
    ...memory,
    longTermSummary: trimLongTermSummary(newLongTerm, MAX_SUMMARY_LENGTH),
    recentEvents: eventsToKeep,
  };
}
