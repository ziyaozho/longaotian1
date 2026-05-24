# 设计文档：热梗注入模块

> 对应 ending.md.txt §5 —— 热梗与鲜活交互的实现

## 背景

ending.md.txt 要求系统对话"像活人在玩梗"。方案A（推荐初期）是维护一个"热梗词库"文件，在生成 prompt 中注入。

当前项目的 `memePackager.ts` 有抖音风格的文本映射，但那是事件→文本的硬编码映射，不是可扩展的热梗词库。

## 目标

1. 创建可人工维护的热梗词库
2. 在 AI prompt 中注入热梗风格指引
3. 系统精灵在对话中自然使用梗（符合角色身份和语境）
4. 词库易于更新（纯数据文件，无需改代码）

---

## 热梗词库

文件：`src/data/memes.ts`

```typescript
export interface MemeEntry {
  phrase: string;        // 梗文本
  context: string;       // 适用语境描述
  style: string;         // 风格标签：吐槽/抒情/高燃/搞怪
  intensity: 'mild' | 'moderate' | 'strong'; // 使用强度
}

/**
 * 热梗词库 —— 可人工定期更新
 * 原则：
 * 1. 梗必须中文互联网通用，避免过于圈层化
 * 2. 梗不过期（避免时效性太强的热点事件）
 * 3. 系统精灵使用梗时必须符合其 dialogueStyle
 */
export const MEME_VOCABULARY: MemeEntry[] = [
  // 通用型梗（长期有效）
  { phrase: '遥遥领先', context: '获得优势或领先时', style: '吐槽', intensity: 'moderate' },
  { phrase: '命运的齿轮开始转动', context: '重大转折或契机', style: '抒情', intensity: 'mild' },
  { phrase: '不是哥们', context: '惊讶或吐槽', style: '吐槽', intensity: 'strong' },
  { phrase: '这波在大气层', context: '智谋深远或布局成功', style: '高燃', intensity: 'moderate' },
  { phrase: '真香', context: '态度反转或承认好处', style: '搞怪', intensity: 'mild' },
  { phrase: '蚌埠住了', context: '忍不住笑或情绪崩溃', style: '吐槽', intensity: 'strong' },
  { phrase: '绝绝子', context: '极度赞赏或极度吐槽', style: '搞怪', intensity: 'moderate' },
  { phrase: '破防了', context: '心理防线被突破', style: '抒情', intensity: 'mild' },
  { phrase: '卷起来了', context: '竞争加剧或内卷场景', style: '吐槽', intensity: 'moderate' },
  { phrase: '躺平', context: '放弃竞争或休息', style: '吐槽', intensity: 'mild' },

  // 系统精灵专用梗（毒舌风格）
  { phrase: '就这？', context: '奖励太少或表现不佳', style: '吐槽', intensity: 'strong' },
  { phrase: '我emo了', context: '系统精灵表达无奈', style: '搞怪', intensity: 'moderate' },
  { phrase: '主打一个陪伴', context: '系统吐槽宿主不给力', style: '吐槽', intensity: 'mild' },

  // 高燃风格
  { phrase: '燃起来了', context: '重大突破或战斗胜利', style: '高燃', intensity: 'strong' },
  { phrase: '这就是宿命', context: '重大抉择时刻', style: '高燃', intensity: 'mild' },
];
```

---

## 根据系统性格筛选梗

```typescript
export function selectMemesForStyle(
  memes: MemeEntry[],
  dialogueStyle: string,
  count: number = 5
): MemeEntry[] {
  // 风格映射
  const styleMap: Record<string, string[]> = {
    '毒舌': ['吐槽', '搞怪'],
    '温柔': ['抒情'],
    '高冷': ['高燃'],
    '搞怪': ['搞怪', '吐槽'],
  };

  const allowedStyles = styleMap[dialogueStyle] || ['吐槽'];

  const filtered = memes.filter((m) => allowedStyles.includes(m.style));

  // 随机选取 count 个
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

---

## AI Prompt 热梗注入

文件：`src/ai/contextManager.ts`

```typescript
export function buildMemeContext(dialogueStyle: string): string {
  const selectedMemes = selectMemesForStyle(MEME_VOCABULARY, dialogueStyle, 5);

  if (selectedMemes.length === 0) return '';

  return `[热梗风格指引]\n` +
    `你可以在系统对话中适当使用以下流行语，但必须符合当前语境和角色身份：\n` +
    selectedMemes.map((m) => `- "${m.phrase}" — ${m.context}`).join('\n') + '\n' +
    `注意：不要强行玩梗，只在自然合适的时候使用。每回合最多使用1-2个梗。`;
}
```

---

## 梗使用统计（可选）

用于监控哪些梗被用得最多，帮助词库优化：

```typescript
export const memeUsageStats: Record<string, number> = {};

export function recordMemeUsage(phrase: string) {
  memeUsageStats[phrase] = (memeUsageStats[phrase] || 0) + 1;
}
```

---

## 后期扩展：RAG 热梗（非首期实现）

方案B（进阶）：对接外部热词源

```typescript
// 伪代码 —— 后期实现
export async function fetchHotMemes(): Promise<MemeEntry[]> {
  // 从微博/百度热搜 API 抓取
  // 过滤敏感词
  // 格式化后返回
}
```

首期不使用此方案，因为：
1. 需要外部 API，增加复杂度和成本
2. 需要处理敏感词和噪声
3. 静态词库已足够提供"鲜活感"

---

## 实现文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/data/memes.ts` | 创建 | 热梗词库数据 |
| `src/ai/contextManager.ts` | 修改 | 新增 buildMemeContext 调用 |
| `src/engine/memePackager.ts` | 修改 | 可选：集成新词库 |
