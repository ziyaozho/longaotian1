interface ContextSlot {
  role: 'system' | 'user';
  content: string;
}

interface WindowConfig {
  systemPromptTokens: number;
  playerStateTokens: number;
  historyTokens: number;
  currentContextTokens: number;
}

const DEFAULT_CONFIG: WindowConfig = {
  systemPromptTokens: 500,
  playerStateTokens: 200,
  historyTokens: 1500,
  currentContextTokens: 300,
};

export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[一-鿿]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

export function summarizeHistory(history: string[], maxTokens: number): string {
  if (history.length === 0) return '无';
  // 保留最近5个完整事件
  const recent = history.slice(-5);
  if (history.length <= 5) {
    const joined = recent.join(' -> ');
    return estimateTokens(joined) <= maxTokens ? joined : recent.slice(-3).join(' -> ');
  }
  // 更早的事件做摘要
  const older = history.slice(0, -5);
  const olderSummary = older.length > 0
    ? `[前${older.length}轮: ${older[0].slice(0, 30)}...等${older.length}轮事件]`
    : '';

  const recentJoined = recent.join(' -> ');
  const full = olderSummary ? `${olderSummary} -> ${recentJoined}` : recentJoined;
  if (estimateTokens(full) <= maxTokens) return full;
  // 如果太长，缩短最近的条目数量
  const shorterRecent = history.slice(-3).join(' -> ');
  if (olderSummary && estimateTokens(olderSummary + ' -> ' + shorterRecent) <= maxTokens) {
    return olderSummary + ' -> ' + shorterRecent;
  }
  return shorterRecent;
}

export function buildOptimizedContext(params: {
  systemPrompt: string;
  playerState: string;
  history: string[];
  currentScene: string;
  endingConstraint?: string;
  config?: Partial<WindowConfig>;
}): ContextSlot[] {
  const cfg = { ...DEFAULT_CONFIG, ...params.config };

  const slots: ContextSlot[] = [
    {
      role: 'system',
      content: params.systemPrompt.slice(0, Math.floor(cfg.systemPromptTokens * 1.5)),
    },
    {
      role: 'user',
      content: `[角色状态]\n${params.playerState}`,
    },
    {
      role: 'user',
      content: `[历史]\n${summarizeHistory(params.history, cfg.historyTokens)}`,
    },
  ];

  // 结局约束注入（ending.md.txt §4）
  if (params.endingConstraint) {
    slots.push({
      role: 'user',
      content: params.endingConstraint.slice(0, Math.floor(cfg.systemPromptTokens * 1.2)),
    });
  }

  slots.push({
    role: 'user',
    content: `[当前]\n${params.currentScene}`,
  });

  return slots;
}

export { DEFAULT_CONFIG };
