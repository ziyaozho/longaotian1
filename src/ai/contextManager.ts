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
  if (history.length <= 5) {
    const joined = history.join(' -> ');
    return estimateTokens(joined) <= maxTokens ? joined : history.slice(-3).join(' -> ');
  }

  const recent = history.slice(-3);
  const older = history.slice(0, -3);

  if (older.length > 0) {
    const summary = `${older[0].slice(0, 30)}...(${older.length}轮省略)... -> ${recent.join(' -> ')}`;
    if (estimateTokens(summary) <= maxTokens) return summary;
    return recent.join(' -> ');
  }
  return recent.join(' -> ');
}

export function buildOptimizedContext(params: {
  systemPrompt: string;
  playerState: string;
  history: string[];
  currentScene: string;
  config?: Partial<WindowConfig>;
}): ContextSlot[] {
  const cfg = { ...DEFAULT_CONFIG, ...params.config };

  return [
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
    {
      role: 'user',
      content: `[当前]\n${params.currentScene}`,
    },
  ];
}

export { DEFAULT_CONFIG };
