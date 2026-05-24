# 设计文档：记忆压缩引擎

> 对应 ending.md.txt §3.2 —— 状态更新与压缩流程

## 背景

ending.md.txt 指出：绝不让原始长对话历史进入 prompt，而是用**结构化状态 + 压缩摘要**替代。无论玩多少回合，发送给 AI 的 prompt 大小始终保持恒定（约 600~1000 token），成本低、延迟稳、模型注意力集中。

当前项目仅在 `contextManager.ts` 中有简单的历史拼接压缩（超过5条就省略中间部分），没有真正的"语义级摘要"机制。

## 目标

1. 每回合自动记录关键事件到 `storyMemory.recentEvents`
2. 当 `recentEvents` 累积到 8 条时，自动压缩为摘要并追加到 `longTermSummary`
3. 压缩后清空 `recentEvents`，只保留最后 3 条作为衔接
4. 玩家决策记录到 `decisionLog`，永不删除（为结局回顾提供素材）
5. 提供降级方案：AI 压缩失败时使用本地模板拼接

---

## 核心流程

```
每回合结束后：
  1. 将本回合的"关键事件"加入 recentEvents
  2. 如果 recentEvents 数量 >= 8:
     a. 调用 AI（或本地模板）将事件压缩为一句剧情摘要
     b. 得到 summary_delta，追加到 longTermSummary 中
     c. 清空 recentEvents，只保留最后 3 条作为衔接
  3. 如果本回合有玩家选择，记录到 decisionLog
  4. 所有属性、道具、关系变化实时写入 protagonist 和 world_state
```

---

## 数据结构

使用已在 `01-core-state.md` 中定义的 `StoryMemory`：

```typescript
export interface StoryMemory {
  longTermSummary: string;
  recentEvents: Array<{ round: number; event: string }>;
  decisionLog: Array<{ round: number; choice: string; result: string }>;
}
```

---

## API 设计

文件：`src/engine/memoryCompression.ts`

### 主入口函数

```typescript
/**
 * 每回合结束时调用，处理记忆更新和压缩
 * @returns 更新后的 StoryMemory
 */
export async function processMemoryAfterTurn(
  storyMemory: StoryMemory,
  currentRound: number,
  newEvent: string,
  newDecision?: { choice: string; result: string },
  useAI: boolean = true
): Promise<StoryMemory> {
  // 1. 添加新事件
  const updated = addEvent(storyMemory, currentRound, newEvent);

  // 2. 记录决策
  const withDecision = newDecision
    ? addDecision(updated, currentRound, newDecision.choice, newDecision.result)
    : updated;

  // 3. 检查是否需要压缩
  if (withDecision.recentEvents.length >= 8) {
    return await compressRecentEvents(withDecision, useAI);
  }

  return withDecision;
}
```

### 添加事件（纯函数）

```typescript
export function addEvent(
  memory: StoryMemory,
  round: number,
  event: string
): StoryMemory {
  return {
    ...memory,
    recentEvents: [
      ...memory.recentEvents,
      { round, event },
    ],
  };
}
```

### 添加决策（纯函数）

```typescript
export function addDecision(
  memory: StoryMemory,
  round: number,
  choice: string,
  result: string
): StoryMemory {
  return {
    ...memory,
    decisionLog: [
      ...memory.decisionLog,
      { round, choice, result },
    ],
  };
}
```

### 压缩近期事件

```typescript
export async function compressRecentEvents(
  memory: StoryMemory,
  useAI: boolean = true
): Promise<StoryMemory> {
  const eventsToCompress = memory.recentEvents.slice(0, -3); // 保留最后3条
  const keepEvents = memory.recentEvents.slice(-3);

  let summaryDelta: string;

  if (useAI) {
    try {
      summaryDelta = await summarizeEventsWithAI(eventsToCompress);
    } catch {
      summaryDelta = fallbackSummarize(eventsToCompress);
    }
  } else {
    summaryDelta = fallbackSummarize(eventsToCompress);
  }

  // 追加到长期摘要
  const newLongTerm = memory.longTermSummary
    ? `${memory.longTermSummary} ${summaryDelta}`
    : summaryDelta;

  // 限制长期摘要长度（防止无限增长）
  const trimmedLongTerm = trimLongTermSummary(newLongTerm, 500);

  return {
    ...memory,
    longTermSummary: trimmedLongTerm,
    recentEvents: keepEvents,
  };
}
```

### AI 摘要调用

```typescript
import { getProvider } from '../ai';

export async function summarizeEventsWithAI(
  events: Array<{ round: number; event: string }>
): Promise<string> {
  const provider = getProvider();

  const eventsText = events
    .map((e) => `第${e.round}回合：${e.event}`)
    .join('\n');

  const prompt = `将以下游戏事件压缩为一句连贯的剧情摘要（100字以内），保留关键信息和因果关系：\n\n${eventsText}`;

  const response = await provider.generate({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5, // 低temperature确保摘要稳定
    maxTokens: 150,
  });

  return response.content.trim();
}
```

**为什么 temperature 用 0.5？** 摘要任务需要稳定、可预期的输出，不需要创造性。低 temperature 减少随机性。

### 本地降级摘要

```typescript
export function fallbackSummarize(
  events: Array<{ round: number; event: string }>
): string {
  if (events.length === 0) return '';
  if (events.length === 1) return events[0].event;

  const first = events[0];
  const last = events[events.length - 1];

  // 简单拼接：首事件 + 发展过程 + 尾事件
  return `${first.event}...（经过${events.length}回合的发展）...${last.event}`;
}
```

### 长期摘要长度限制

```typescript
export function trimLongTermSummary(summary: string, maxChars: number): string {
  if (summary.length <= maxChars) return summary;

  // 保留开头和结尾，中间用省略号
  const half = Math.floor(maxChars / 2) - 5;
  return summary.slice(0, half) + ' ... ' + summary.slice(-half);
}
```

---

## 关键事件提取

不是所有回合都值得记录。需要有一个"关键事件提取"函数，判断本回合是否值得记录：

```typescript
export function extractKeyEvent(
  turnResult: TurnResult,
  player: Player
): string | null {
  const events: string[] = [];

  // 重大属性变化
  if (turnResult.effects.hpChange < -20) events.push(`遭受重创，生命值减少${Math.abs(turnResult.effects.hpChange)}`);
  if (turnResult.effects.expGain > 50) events.push(`获得大量经验，实力显著提升`);

  // 获得/失去重要物品
  if (turnResult.droppedItems?.length > 0) {
    const rareItems = turnResult.droppedItems.filter((i) => i.rarity === 'epic' || i.rarity === 'legendary');
    if (rareItems.length > 0) {
      events.push(`获得稀有物品：${rareItems.map((i) => i.name).join('、')}`);
    }
  }

  // 新任务
  if (turnResult.newTasks?.length > 0) {
    events.push(`接受新任务：${turnResult.newTasks[0].name}`);
  }

  // 新成就
  if (turnResult.newAchievements?.length > 0) {
    events.push(`解锁成就`);
  }

  // 战斗结果
  if (turnResult.combatResult) {
    const { isVictory, enemyName } = turnResult.combatResult;
    events.push(isVictory ? `战胜${enemyName}` : `被${enemyName}击败`);
  }

  // NPC邂逅
  // （需要在 orchestrator.ts 中传递NPC信息）

  // 合并为一句
  if (events.length === 0) return null;
  if (events.length === 1) return events[0];
  return events.join('；');
}
```

**如果本回合没有关键事件，是否记录？**

方案：仍然记录，但内容简单。如 `"第${round}回合：日常修炼，实力稳步提升"`。这样 recentEvents 始终有内容，压缩时不会出现空洞。

---

## 与现有系统的集成

### 集成点：orchestrator.ts processTurn

在 `processTurn` 函数的末尾，返回 `TurnResult` 之前：

```typescript
// 提取关键事件
const keyEvent = extractKeyEvent(turnResult, player);

// 更新故事记忆
const newMemory = await processMemoryAfterTurn(
  player.storyMemory,
  player.progress.round,
  keyEvent || `第${player.progress.round}回合的日常`,
  // 如果有选择，记录决策
  selectedChoice
    ? { choice: selectedChoice.text, result: selectedChoice.consequence || '无' }
    : undefined
);

// 写入 store
playerStore.updateStoryMemory(newMemory);
```

### 集成点：contextManager.ts

修改 `buildOptimizedContext`，用 `storyMemory` 替代原始的 `history`：

```typescript
// 修改前
{
  role: 'user',
  content: `[历史]\n${summarizeHistory(params.history, cfg.historyTokens)}`,
}

// 修改后
{
  role: 'user',
  content: `[长期剧情摘要]\n${player.storyMemory.longTermSummary || '游戏刚开始'}`,
},
{
  role: 'user',
  content: `[近期事件]\n${player.storyMemory.recentEvents.map(e => `第${e.round}回合：${e.event}`).join('\n')}`,
},
```

---

## Prompt 大小控制

通过记忆压缩，发送给 AI 的上下文大小保持恒定：

| 部分 | 预估 Token |
|------|-----------|
| systemPrompt | ~500 |
| playerState | ~200 |
| longTermSummary | ~200 |
| recentEvents (3~5条) | ~150 |
| 结局约束 | ~100 |
| 当前场景 | ~100 |
| **总计** | **~1250** |

无论运行多少回合，prompt 大小不会增长（longTermSummary 有长度限制，recentEvents 始终只保留 3~5 条）。

---

## 实现文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/engine/memoryCompression.ts` | 创建 | 记忆压缩引擎全部逻辑 |
| `src/ai/contextManager.ts` | 修改 | 用 storyMemory 替代原始 history |
| `src/agents/orchestrator.ts` | 修改 | 每回合调用 processMemoryAfterTurn |
| `src/store/playerStore.ts` | 修改 | 新增 updateStoryMemory 等方法（见 01-core-state.md） |
