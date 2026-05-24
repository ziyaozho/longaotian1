# 设计文档：结局引导系统

> 对应 ending.md.txt §4 —— 结局引导系统

## 背景

ending.md.txt 的核心设计之一是：开局根据玩家属性随机选定一个隐藏结局（共8个），然后所有剧情向该结局靠拢。这样 AI 就像"带着剧本大纲的导演"，既不会剧透，又能让每一次生成都服务于最终高潮。

当前项目仅有简单的评分结局（S/A/B/C），没有隐藏结局概念，也没有结局驱动的剧情引导。

## 目标

1. 开局根据属性倾向加权随机选定一个隐藏结局
2. 每回合计算结局条件完成度，向 AI prompt 注入结局约束
3. 结局达成或失败时触发对应的 Game Over 流程
4. 结局回顾必须基于真实的玩家决策日志，不能捏造

---

## 数据结构

### EndingDefinition（已在 01-core-state.md 定义）

```typescript
export interface EndingDefinition {
  endingId: string;
  name: string;
  description: string;
  victoryConditions: string[];  // 如 ["wealth >= 100000", "npc:苏晴 >= 80"]
  failConditions: string[];     // 如 ["dead", "npc:苏晴 <= -50"]
  tone: string;                 // 如 "温情但带一点遗憾"
}
```

### 8 个隐藏结局设计

| endingId | 名称 | 对应世界 | 基调 |
|---------|------|---------|------|
| ending_modern_king | 都市之王 | 现代都市 | 霸气但带孤独 |
| ending_immortal_hermit | 隐世丹神 | 修仙世界 | 温情但带遗憾 |
| ending_urban_legend | 都市传说 | 都市玄幻 | 神秘而悲凉 |
| ending_apocalypse_savior | 末世救主 | 末世降临 | 热血而沉重 |
| ending_apoc_fantasy_rider | 天启骑士 | 末世玄幻 | 宿命而壮烈 |
| ending_hidden_immortal | 仙道独尊 | 洪荒世界 | 超脱而寂寥 |
| ending_cyber_god | 数据飞升 | 赛博修仙 | 冰冷而自由 |
| ending_demon_overlord | 魔神降世 | 魔神纪元 | 霸气而黑暗 |

**示例结局定义（现代都市）：**

```typescript
{
  endingId: 'ending_modern_king',
  name: '都市之王',
  description: '主角凭借系统之力成为都市暗面的统治者，站在权力之巅俯瞰众生，但蓦然回首，发现自己早已失去了最初的纯真与平凡的快乐。',
  victoryConditions: ['wealth >= 100000', 'fame >= 1000', 'combatPower >= 5000'],
  failConditions: ['dead', 'wealth <= 0'],
  tone: '霸气但带孤独',
}
```

**示例结局定义（修仙世界）：**

```typescript
{
  endingId: 'ending_immortal_hermit',
  name: '隐世丹神',
  description: '主角凭借逆天天赋成为最强炼丹师，但选择远离纷争，与红颜知己隐居山林，从此不问世事。',
  victoryConditions: ['has_item:九转金丹', 'npc:苏晴 >= 80', 'global:free_will == true'],
  failConditions: ['dead', 'talent <= 5', 'npc:苏晴 <= -50'],
  tone: '温情但带一点遗憾',
}
```

---

## 开局结局选定算法

文件：`src/engine/endingTracker.ts`

### 属性倾向权重映射

```typescript
const ENDING_ATTR_WEIGHTS: Record<string, Record<string, number>> = {
  ending_modern_king:     { family: 2, intelligence: 1, appearance: 1 },
  ending_immortal_hermit: { talent: 3, intelligence: 1, luck: 1 },
  ending_urban_legend:    { talent: 2, luck: 2, appearance: 1 },
  ending_apocalypse_savior: { physique: 2, family: 1, luck: 1 },
  ending_apoc_fantasy_rider: { physique: 2, talent: 1, appearance: 1 },
  ending_hidden_immortal: { talent: 2, intelligence: 1, luck: 1 },
  ending_cyber_god:       { intelligence: 3, talent: 1 },
  ending_demon_overlord:  { talent: 2, physique: 1, family: -1 },
};
```

### 加权随机选择函数

```typescript
export function selectEndingByAttributes(
  attributes: Attributes,
  endings: EndingDefinition[]
): EndingDefinition {
  const weights = endings.map((ending) => {
    const weightMap = ENDING_ATTR_WEIGHTS[ending.endingId] ?? {};
    let score = 1; // 基础分
    for (const [attr, multiplier] of Object.entries(weightMap)) {
      const val = (attributes as Record<string, number>)[attr] ?? 0;
      score += val * multiplier;
    }
    return { ending, score };
  });

  const total = weights.reduce((sum, w) => sum + w.score, 0);
  let rand = Math.random() * total;

  for (const { ending, score } of weights) {
    rand -= score;
    if (rand <= 0) return ending;
  }

  return endings[0];
}
```

**设计意图：** 属性倾向影响概率但不决定结果。全加天赋的玩家更可能抽到修仙/玄幻类结局，但仍有概率抽到都市结局（制造"反差感"也是一种乐趣）。

---

## 结局进度追踪

### 条件表达式解析器

```typescript
export function evaluateCondition(
  condition: string,
  player: Player
): boolean | number {
  // "wealth >= 100000"
  const statMatch = condition.match(/^(\w+)\s*([>=<]+)\s*(\d+)$/);
  if (statMatch) {
    const [, key, op, val] = statMatch;
    const actual = (player.stats as Record<string, number>)[key] ?? 0;
    const target = parseInt(val, 10);
    switch (op) {
      case '>=': return actual >= target;
      case '<=': return actual <= target;
      case '>': return actual > target;
      case '<': return actual < target;
      case '==': return actual === target;
    }
  }

  // "npc:苏晴 >= 80"
  const npcMatch = condition.match(/^npc:(.+)\s*([>=<]+)\s*(-?\d+)$/);
  if (npcMatch) {
    const [, name, op, val] = npcMatch;
    const actual = player.relationships[name] ?? 0;
    const target = parseInt(val, 10);
    // ... 同上
  }

  // "has_item:九转金丹"
  const itemMatch = condition.match(/^has_item:(.+)$/);
  if (itemMatch) {
    const itemName = itemMatch[1];
    return player.inventory.some((i) => i.name === itemName);
  }

  // "dead"
  if (condition === 'dead') return player.stats.hp <= 0;

  // "global:xxx == true"
  const globalMatch = condition.match(/^global:(\w+)\s*==\s*(true|false)$/);
  if (globalMatch) {
    const [, flag, val] = globalMatch;
    return player.worldState.globalFlags[flag] === (val === 'true');
  }

  return false;
}
```

### 进度计算函数

```typescript
export function calculateEndingProgress(
  player: Player,
  ending: EndingDefinition
): Record<string, boolean | number> {
  const status: Record<string, boolean | number> = {};

  for (const cond of ending.victoryConditions) {
    status[cond] = evaluateCondition(cond, player);
  }
  for (const cond of ending.failConditions) {
    status[`fail_${cond}`] = evaluateCondition(cond, player);
  }

  return status;
}
```

### 结局触发检测

```typescript
export function checkEndingTrigger(
  player: Player,
  ending: EndingDefinition
): { triggered: boolean; isVictory: boolean } {
  const progress = calculateEndingProgress(player, ending);

  // 检查失败条件
  const anyFail = ending.failConditions.some(
    (c) => progress[`fail_${c}`] === true
  );
  if (anyFail) return { triggered: true, isVictory: false };

  // 检查胜利条件（全部满足）
  const allVictory = ending.victoryConditions.every(
    (c) => progress[c] === true
  );
  if (allVictory) return { triggered: true, isVictory: true };

  return { triggered: false, isVictory: false };
}
```

---

## AI Prompt 结局约束注入

文件：`src/ai/contextManager.ts`

在 `buildOptimizedContext` 函数的返回数组中，新增一个 `[隐藏结局指引]` 段：

```typescript
{
  role: 'user',
  content: buildEndingConstraint(player, ending),
}
```

### 构建结局约束文本

```typescript
function buildEndingConstraint(
  player: Player,
  ending: EndingDefinition
): string {
  const progress = calculateEndingProgress(player, ending);

  let progressText = '';
  for (const cond of ending.victoryConditions) {
    const val = progress[cond];
    const display = typeof val === 'boolean'
      ? (val ? '✓ 已完成' : '○ 未完成')
      : `${val}`;
    progressText += `- ${cond} (${display})\n`;
  }

  return `[隐藏结局指引 - 仅限系统内部参考，不可直接向玩家透露结局名称]\n` +
    `结局代号：${ending.endingId}\n` +
    `达成条件：${ending.victoryConditions.join('，')}\n` +
    `当前进度：\n${progressText}` +
    `基调要求：${ending.tone}\n` +
    `请生成符合此方向的剧情。可以设置障碍、诱惑、意外，但总体不得永久封闭达成结局的可能性。`;
}
```

**注意：** 此段不会显示给玩家，仅注入 AI prompt。玩家只会通过模糊的"命运预感"线索感知到存在某种方向。

---

## 结局回顾生成

文件：`src/engine/endingTracker.ts`

### 生成回顾 Prompt

```typescript
export function buildEndingReviewPrompt(player: Player, ending: EndingDefinition): string {
  const decisions = player.storyMemory.decisionLog;
  const summary = player.storyMemory.longTermSummary;

  return `请根据以下玩家真实历程，写一段 300 字以内的结局回顾文。\n\n` +
    `结局名称：${ending.name}\n` +
    `结局基调：${ending.tone}\n` +
    `长期剧情摘要：${summary || '无'}\n\n` +
    `关键决策记录（必须提及至少 3 个）：\n` +
    decisions.map((d) => `- 第${d.round}回合：选择"${d.choice}"，结果：${d.result}`).join('\n') + '\n\n' +
    `要求：\n` +
    `1. 语气需符合结局的"${ending.tone}"基调\n` +
    `2. 必须提及至少 3 个具体的选择及后果\n` +
    `3. 可以适当抒情，但所有事件必须真实对应上述记录\n` +
    `4. 不要编造记录中没有的事件或NPC\n` +
    `5. 以第二人称"你"叙述`;
}
```

**为什么不会捏造？** 因为回顾是基于结构化的 `decisionLog` 生成的，AI 被明确要求"不要编造记录中没有的事件"。

---

## 集成流程

### 开局流程（orchestrator.ts / CharacterCreate.tsx）

```
1. 玩家完成属性分配
2. 调用 selectEndingByAttributes(attributes, ENDINGS)
3. 将选定的 endingId 写入 player.endingProgress.targetEndingId
4. 初始化 conditionStatus
5. 开始游戏
```

### 每回合流程（orchestrator.ts processTurn）

```
1. 构建 AI prompt（包含结局约束段）
2. AI 生成剧情
3. 玩家做出选择
4. 更新 player 状态
5. 调用 addRecentEvent、addDecisionLog 记录故事记忆
6. 调用 checkEndingTrigger 检测是否触发结局
7. 如果触发 → 跳转到 GameOver，传入结局结果
```

---

## 评分算法（确定算法，不用 AI）

```typescript
export function calculateEndingGrade(player: Player): 'S' | 'A' | 'B' | 'C' | 'D' {
  const { stats, storyMemory, endingProgress } = player;

  let score = 0;

  // 基础属性分（0-30）
  score += Math.min(30, (stats.combatPower / 5000) * 30);

  // 财富声望分（0-20）
  score += Math.min(20, ((stats.wealth + stats.fame * 100) / 100000) * 20);

  // 决策丰富度分（0-20）
  score += Math.min(20, storyMemory.decisionLog.length * 2);

  // 结局完成度分（0-30）
  const conditions = Object.values(endingProgress.conditionStatus);
  const completed = conditions.filter((c) => c === true).length;
  score += conditions.length > 0 ? (completed / conditions.length) * 30 : 0;

  // 评级
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 30) return 'C';
  return 'D';
}
```

---

## 实现文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/data/endings.ts` | 创建 | 8个结局定义数据 |
| `src/engine/endingTracker.ts` | 创建 | 结局选定、进度追踪、触发检测、评分算法 |
| `src/ai/contextManager.ts` | 修改 | 新增 buildEndingConstraint 调用 |
| `src/agents/orchestrator.ts` | 修改 | 开局调用 selectEndingByAttributes，每回合调用 checkEndingTrigger |
| `src/components/screens/GameOver.tsx` | 修改 | 显示结局回顾、决策时间线、评分 |
| `src/store/playerStore.ts` | 修改 | 新增结局相关 store 方法（见 01-core-state.md） |
