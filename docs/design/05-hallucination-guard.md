# 设计文档：反幻觉与内容校验层

> 对应 ending.md.txt §8 —— 防幻觉与质量保障

## 背景

ending.md.txt 明确指出：AI 作为"有剧本的即兴演员"，需要通过工程手段守住逻辑底线。常见幻觉包括：剧情循环重复、遗忘已发生事实、NPC复活、道具凭空消失、结局偏离等。

当前项目没有任何内容校验机制，AI 生成的内容直接展示给玩家。

## 目标

1. 对 AI 生成的每回合内容进行结构化校验
2. 检测并拦截明显的幻觉（NPC复活、道具凭空变化、重复事件）
3. 发现偏离结局方向时触发修正
4. 校验失败时自动重试（最多2次），多次失败后回退到本地模板

---

## 校验框架

文件：`src/engine/hallucinationGuard.ts`

### 输入类型

```typescript
import type { Choice } from '../types';

/**
 * AI 生成的单回合内容（要求AI以JSON格式输出）
 */
export interface GeneratedTurnPayload {
  narrative: string;           // 场景描述文本
  systemDialogue: string;      // 系统精灵对话
  choices: Choice[];           // 玩家选择
  attributeChanges: Record<string, number>; // 属性变化
  newEvents: string[];         // 本回合产生的新事件标签
  npcMentions?: string[];      // 提及的NPC名称列表
  locationChange?: string;     // 地点变化（如果有）
  flagChanges?: Record<string, boolean>; // 全局标记变化
}
```

### 校验结果

```typescript
export interface ValidationResult {
  valid: boolean;              // 是否通过校验
  issues: ValidationIssue[];   // 发现的问题列表
  severity: 'none' | 'minor' | 'major' | 'critical'; // 严重程度
  corrected?: Partial<GeneratedTurnPayload>; // 尝试修正后的内容
}

export interface ValidationIssue {
  type: 'npc_hallucination' | 'item_hallucination' | 'event_repeat' | 'ending_deviation' | 'location_inconsistency';
  message: string;
  severity: 'minor' | 'major' | 'critical';
  suggestion?: string; // 修正建议
}
```

---

## 校验规则实现

### 规则1：NPC 复活检测（critical）

```typescript
function checkNPCRevival(
  payload: GeneratedTurnPayload,
  player: Player
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const npcName of payload.npcMentions || []) {
    const npc = player.npcs.find((n) => n.name === npcName);
    if (npc && !npc.isAlive) {
      issues.push({
        type: 'npc_hallucination',
        message: `NPC "${npcName}" 已在第${npc.firstMetRound}回合死亡，不应再次出现`,
        severity: 'critical',
        suggestion: `移除${npcName}的出现，或用其他NPC替代`,
      });
    }
  }

  return issues;
}
```

### 规则2：道具凭空出现/消失检测（major）

```typescript
function checkItemHallucination(
  payload: GeneratedTurnPayload,
  player: Player
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 检查 attributeChanges 中是否包含不合理的数值跳跃
  for (const [key, delta] of Object.entries(payload.attributeChanges)) {
    const current = (player.stats as Record<string, number>)[key] ??
                    (player.attributes as Record<string, number>)[key] ?? 0;

    // 单次变化超过当前值的50%视为可疑
    if (Math.abs(delta) > current * 0.5 && current > 0) {
      issues.push({
        type: 'item_hallucination',
        message: `${key} 单次变化 ${delta}，超过当前值 ${current} 的50%，可能不合理`,
        severity: 'major',
        suggestion: '将变化幅度限制在合理范围内',
      });
    }
  }

  return issues;
}
```

### 规则3：重复事件检测（minor）

```typescript
function checkEventRepetition(
  payload: GeneratedTurnPayload,
  player: Player
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const recentSet = new Set(player.storyMemory.recentEvents.map((e) => e.event));

  for (const event of payload.newEvents) {
    if (recentSet.has(event)) {
      issues.push({
        type: 'event_repeat',
        message: `事件 "${event}" 与近期事件重复`,
        severity: 'minor',
        suggestion: '换一个不同的事件',
      });
    }
  }

  return issues;
}
```

### 规则4：结局偏离检测（major）

```typescript
function checkEndingDeviation(
  payload: GeneratedTurnPayload,
  player: Player
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ending = getEndingById(player.endingProgress.targetEndingId);
  if (!ending) return issues;

  // 检查 choices 是否永久封闭了结局可能性
  for (const choice of payload.choices) {
    const text = choice.text.toLowerCase();

    // 如果结局需要与某NPC保持好感，检查是否有选项会直接杀死/彻底得罪该NPC
    for (const condition of ending.victoryConditions) {
      const npcMatch = condition.match(/^npc:(.+)\s*>=/);
      if (npcMatch) {
        const npcName = npcMatch[1];
        // 简单启发式：如果选项文本包含"杀"、"背叛"等词且涉及该NPC
        if (text.includes('杀') || text.includes('背叛') || text.includes('伤害')) {
          // 这是一个潜在的结局封闭风险
          issues.push({
            type: 'ending_deviation',
            message: `选项 "${choice.text}" 可能永久破坏结局条件 "${condition}"`,
            severity: 'major',
            suggestion: '修改选项使其不永久封闭结局可能性，或添加替代路径',
          });
        }
      }
    }
  }

  return issues;
}
```

### 规则5：地点不一致检测（minor）

```typescript
function checkLocationConsistency(
  payload: GeneratedTurnPayload,
  player: Player
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (payload.locationChange) {
    // 检查新地点是否与当前场景类型匹配
    const scene = getSceneById(player.progress.sceneType);
    // 简单的启发式：某些地点名称不应该出现在某些场景中
    // 如"修仙世界"不应该出现"地铁站"
    const sceneKeywords: Record<string, string[]> = {
      modern_city: ['地铁', '公司', '街头', '酒吧', '停车场'],
      cultivation: ['宗门', '洞府', '灵脉', '仙山', '秘境'],
      // ... 其他场景
    };

    const allowed = sceneKeywords[player.progress.sceneType] || [];
    const isConsistent = allowed.some((k) => payload.locationChange!.includes(k));

    if (!isConsistent && allowed.length > 0) {
      issues.push({
        type: 'location_inconsistency',
        message: `地点 "${payload.locationChange}" 与当前场景 "${scene?.name}" 风格不一致`,
        severity: 'minor',
        suggestion: `将地点修改为符合${scene?.name}风格的场所`,
      });
    }
  }

  return issues;
}
```

---

## 主校验入口

```typescript
export function validateGeneratedContent(
  payload: GeneratedTurnPayload,
  player: Player
): ValidationResult {
  const allIssues: ValidationIssue[] = [];

  allIssues.push(...checkNPCRevival(payload, player));
  allIssues.push(...checkItemHallucination(payload, player));
  allIssues.push(...checkEventRepetition(payload, player));
  allIssues.push(...checkEndingDeviation(payload, player));
  allIssues.push(...checkLocationConsistency(payload, player));

  const hasCritical = allIssues.some((i) => i.severity === 'critical');
  const hasMajor = allIssues.some((i) => i.severity === 'major');

  const severity: ValidationResult['severity'] = hasCritical
    ? 'critical'
    : hasMajor
    ? 'major'
    : allIssues.length > 0
    ? 'minor'
    : 'none';

  return {
    valid: allIssues.length === 0,
    issues: allIssues,
    severity,
  };
}
```

---

## 自动重试机制

文件：`src/agents/orchestrator.ts`

```typescript
const MAX_RETRIES = 2;

async function generateWithValidation(
  prompt: string,
  player: Player
): Promise<GeneratedTurnPayload> {
  let lastIssues: ValidationIssue[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // 构建带修正指令的 prompt
    let finalPrompt = prompt;
    if (lastIssues.length > 0) {
      finalPrompt += '\n\n[修正要求] 上次生成存在以下问题，请务必避免：\n' +
        lastIssues.map((i) => `- ${i.message}。建议：${i.suggestion}`).join('\n');
    }

    // 调用 AI
    const rawResponse = await provider.generate({ messages: [{ role: 'user', content: finalPrompt }] });

    // 解析 JSON
    let payload: GeneratedTurnPayload;
    try {
      payload = JSON.parse(rawResponse.content);
    } catch {
      // JSON 解析失败，回退到模板
      return generateFallbackTurn(player);
    }

    // 校验
    const validation = validateGeneratedContent(payload, player);

    if (validation.valid) {
      return payload;
    }

    lastIssues = validation.issues;

    // 如果是最后一次尝试，记录失败日志
    if (attempt === MAX_RETRIES) {
      console.warn('AI生成内容校验多次失败，回退到本地模板', validation.issues);
    }
  }

  // 回退到本地模板
  return generateFallbackTurn(player);
}
```

---

## AI 参数配置

文件：`src/ai/deepseek.ts`

确保叙事生成使用以下固定参数：

```typescript
const NARRATIVE_GENERATION_PARAMS = {
  temperature: 0.8,
  frequency_penalty: 0.4,
  presence_penalty: 0.4,
  maxTokens: 800,
  responseFormat: { type: 'json_object' }, // 强制 JSON 输出
};
```

**JSON 输出字段要求：**

```typescript
interface RequiredJSONFields {
  narrative: string;        // 场景描述（200字以内）
  systemDialogue: string;   // 系统精灵对话（可选，50字以内）
  choices: Array<{          // 2~4个选择
    id: string;
    text: string;
    consequence?: string;
  }>;
  attributeChanges: Record<string, number>; // 属性变化，如 { hp: -10, exp: 50 }
  newEvents: string[];      // 本回合关键事件标签
  npcMentions?: string[];   // 提及的NPC名称
  locationChange?: string;  // 地点变化
  flagChanges?: Record<string, boolean>; // 全局标记变化
}
```

---

## 幻觉检测统计

```typescript
// 用于监控和调试
export const hallucinationStats = {
  totalTurns: 0,
  totalIssues: 0,
  issueByType: {} as Record<string, number>,
  retryCount: 0,
  fallbackCount: 0,
};

export function recordValidation(result: ValidationResult) {
  hallucinationStats.totalTurns++;
  hallucinationStats.totalIssues += result.issues.length;
  for (const issue of result.issues) {
    hallucinationStats.issueByType[issue.type] =
      (hallucinationStats.issueByType[issue.type] || 0) + 1;
  }
}
```

---

## 实现文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/engine/hallucinationGuard.ts` | 创建 | 全部校验逻辑 |
| `src/agents/orchestrator.ts` | 修改 | 集成 generateWithValidation 重试机制 |
| `src/ai/deepseek.ts` | 修改 | 配置 narrative 生成参数 |
| `src/agents/types.ts` | 修改 | 添加 GeneratedTurnPayload 类型 |
