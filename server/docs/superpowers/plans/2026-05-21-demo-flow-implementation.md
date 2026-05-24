# 演示流程与 API 接入 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为"人生重开模拟器"添加演示模式（URL 参数 ?demo=true），包含预缓存系统、演示辅助 UI 叠加层，以及完整的 DeepSeek API 优化（流式 SSE + 上下文窗口管理 + 3 级容错）。

**架构：** 在现有 orchestrator/contentGenerator 入口处增加 isDemo 判断分叉，Demo 模式走预缓存 + 编排器路径，正常模式不变。isDemo 通过 React Context 传递，不进 Store。

**技术栈：** React 19 + TypeScript 6 + Vite 8 + Zustand 5 + Framer Motion 12 + Tailwind CSS 4

---

### 任务 1：创建 DemoContext

**文件：**
- 创建：`src/demo/DemoContext.tsx`

- [ ] **步骤 1：创建 DemoContext 和 Provider**

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';

interface DemoContextValue {
  isDemo: boolean;
}

const DemoContext = createContext<DemoContextValue>({ isDemo: false });

export function useDemo(): DemoContextValue {
  return useContext(DemoContext);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return { isDemo: params.get('demo') === 'true' };
  }, []);

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit --pretty false`
预期：PASS，无新增错误

- [ ] **步骤 3：在 App.tsx 中包裹 DemoProvider**

读取 `src/App.tsx`，在 `<ParticleBackground />` 外层包裹 `<DemoProvider>`：

```tsx
import { DemoProvider } from './demo/DemoContext';

function App() {
  return (
    <DemoProvider>
      <div className="min-h-screen bg-game-bg text-white relative">
        {/* 现有内容不变 */}
      </div>
    </DemoProvider>
  );
}
```

- [ ] **步骤 4：运行 dev server 验证**

运行：`npx vite --host`
打开 `http://localhost:5173?demo=true` 和 `http://localhost:5173`，确认两个 URL 都能正常加载到开始界面，无报错。

- [ ] **步骤 5：Commit**

---

### 任务 2：创建 demoConfig.ts

**文件：**
- 创建：`src/demo/demoConfig.ts`

- [ ] **步骤 1：定义 Demo 配置类型和常量**

```typescript
import type { Player } from '../types';

/* ========== 预设角色 ========== */
export const DEMO_PLAYER: Partial<Player> = {
  attributes: {
    talent: 9,
    appearance: 6,
    intelligence: 7,
    physique: 6,
    family: 5,
    luck: 7,
  },
  stats: {
    level: 1,
    exp: 0,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    combatPower: 15,
    wealth: 500,
    fame: 10,
  },
};

/* ========== 演示配置 ========== */
export const DEMO_SCENE = 'cultivation';
export const DEMO_SYSTEM = 'devour_evolution';

/* ========== 事件序列定义 ========== */
export type DemoPhase = 'intro' | 'turn1' | 'turn2' | 'climax' | 'ending';

export interface DemoPhaseConfig {
  id: DemoPhase;
  label: string;
  highlight: string;
  durationMs: number; // 此阶段预期时长
  precacheEventId: string;
  narrationTech: string;
  narrationExp: string;
}

export const DEMO_PHASES: DemoPhaseConfig[] = [
  {
    id: 'intro',
    label: '开局',
    highlight: '叙事+世界观',
    durationMs: 45000,
    precacheEventId: 'char_create',
    narrationTech: '整个角色属性系统完全由AI驱动，每一个数值都会影响后续生成的内容方向',
    narrationExp: '我们设计了8个独立的世界，每个世界都有完整的叙事弧线和世界观设定',
  },
  {
    id: 'turn1',
    label: '第一回合',
    highlight: 'AI实时生成',
    durationMs: 40000,
    precacheEventId: 'turn_1',
    narrationTech: '系统将角色状态、世界设定、历史选择打包成结构化提示词发送给DeepSeek',
    narrationExp: 'AI会根据你的属性和之前的选择动态生成场景——每次玩都不一样',
  },
  {
    id: 'turn2',
    label: '第二回合',
    highlight: '玩法系统深度',
    durationMs: 40000,
    precacheEventId: 'turn_2',
    narrationTech: '我们实现了分层容错：API超时自动降级到本地模板引擎，保证体验不中断',
    narrationExp: '系统人格有4个进化阶段——它正从一个冷冰冰的程序变成你的伙伴',
  },
  {
    id: 'climax',
    label: '高潮',
    highlight: '叙事爆点',
    durationMs: 30000,
    precacheEventId: 'climax_reveal',
    narrationTech: '叙事系统包含8个世界×4幕×多个故事节点，总共超过200个手写叙事节点',
    narrationExp: '这个选择不是预设的——你会真实地影响后续世界的剧情走向',
  },
  {
    id: 'ending',
    label: '收尾',
    highlight: '留白引导',
    durationMs: 25000,
    precacheEventId: 'ending',
    narrationTech: '完整项目已生产构建就绪，支持离线模板回退，适配移动端',
    narrationExp: '这只是一个世界的冒险——完整游戏有8个世界、10个系统等待探索',
  },
];

/* ========== 演示开局完整参数 ========== */
export const DEMO_START_CONFIG = {
  player: DEMO_PLAYER,
  sceneId: DEMO_SCENE,
  systemId: DEMO_SYSTEM,
  phases: DEMO_PHASES,
};
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit --pretty false`
预期：PASS

- [ ] **步骤 3：Commit**

---

### 任务 3：创建 precacheService.ts

**文件：**
- 创建：`src/demo/precacheService.ts`
- 创建：`src/demo/precache/demo_v1.json`（占位，后续 task 生成真实内容）

- [ ] **步骤 1：创建预缓存占位文件**

```json
{
  "version": "demo_v1",
  "generatedAt": "PLACEHOLDER",
  "events": {}
}
```

- [ ] **步骤 2：编写 precacheService**

```typescript
import type { TurnResult } from '../agents/orchestrator';

interface PrecacheEntry {
  version: string;
  generatedAt: string;
  events: Record<string, TurnResult>;
}

let cache: PrecacheEntry | null = null;

export async function loadPrecache(): Promise<PrecacheEntry> {
  if (cache) return cache;
  const mod = await import('./precache/demo_v1.json');
  cache = mod.default as PrecacheEntry;
  return cache!;
}

export function getPrecachedTurn(eventId: string): TurnResult | null {
  return cache?.events[eventId] ?? null;
}

export function getPrecacheVersion(): string | null {
  return cache?.version ?? null;
}

export function isPrecacheLoaded(): boolean {
  return cache !== null;
}
```

- [ ] **步骤 3：验证 TypeScript 编译**

运行：`npx tsc --noEmit --pretty false`
预期：PASS（注意 JSON import 需要 `resolveJsonModule`，检查 tsconfig.json 已有此配置）

- [ ] **步骤 4：Commit**

---

### 任务 4：创建 demoOrchestrator.ts

**文件：**
- 创建：`src/demo/demoOrchestrator.ts`

- [ ] **步骤 1：编写 Demo 编排器**

```typescript
import type { Player } from '../types';
import type { TurnResult } from '../agents/orchestrator';
import { loadPrecache, getPrecachedTurn } from './precacheService';
import { DEMO_PHASES, type DemoPhase, type DemoPhaseConfig } from './demoConfig';

let currentPhaseIndex = 0;
let isRunning = false;
let isPaused = false;

export function resetDemo(): void {
  currentPhaseIndex = 0;
  isRunning = false;
  isPaused = false;
}

export function getCurrentPhase(): DemoPhaseConfig | null {
  return DEMO_PHASES[currentPhaseIndex] ?? null;
}

export function advancePhase(): DemoPhaseConfig | null {
  currentPhaseIndex = Math.min(currentPhaseIndex + 1, DEMO_PHASES.length - 1);
  return getCurrentPhase();
}

export function skipToPhase(phase: DemoPhase): void {
  const idx = DEMO_PHASES.findIndex((p) => p.id === phase);
  if (idx >= 0) currentPhaseIndex = idx;
}

export function togglePause(): boolean {
  isPaused = !isPaused;
  return isPaused;
}

export function getDemoPhaseIndex(): number {
  return currentPhaseIndex;
}

export function getDemoPhaseCount(): number {
  return DEMO_PHASES.length;
}

export function isDemoPaused(): boolean {
  return isPaused;
}

export async function executeDemoTurn(
  player: Player,
): Promise<TurnResult> {
  isRunning = true;

  const cache = await loadPrecache();
  const phase = DEMO_PHASES[currentPhaseIndex];
  if (!phase) {
    throw new Error(`No demo phase at index ${currentPhaseIndex}`);
  }

  const cached = getPrecachedTurn(phase.precacheEventId);
  if (cached) {
    return { ...cached, usedFallback: false };
  }

  // 缓存未命中：用缓存的第一个事件兜底
  const fallback = getPrecachedTurn('char_create');
  if (fallback) {
    console.warn(`Demo cache miss for "${phase.precacheEventId}", using char_create fallback`);
    return { ...fallback, usedFallback: true };
  }

  throw new Error('Demo precache is empty. Run "pnpm run precache" first.');
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit --pretty false`
预期：PASS

- [ ] **步骤 3：Commit**

---

### 任务 5：修改 orchestrator.ts — isDemo 分叉

**文件：**
- 修改：`src/agents/orchestrator.ts:324-354`

- [ ] **步骤 1：在 processTurn 函数开头添加 Demo 路径判断**

在 `src/agents/orchestrator.ts` 的 `processTurn` 函数（第 324 行）内部，函数体最开头 `const context = buildContext(player);` 之前，添加：

```typescript
// Demo 模式：走预缓存路径
if (new URLSearchParams(window.location.search).get('demo') === 'true') {
  const { executeDemoTurn } = await import('../demo/demoOrchestrator');
  return executeDemoTurn(player);
}
```

- [ ] **步骤 2：运行 TypeScript 编译验证**

运行：`npx tsc --noEmit --pretty false`
预期：PASS

- [ ] **步骤 3：启动 dev server 验证 Demo 模式不报错**

运行：`npx vite --host`
打开 `http://localhost:5173?demo=true`
预期：进入游戏后点击"开始"会走到 demo 路径（目前预缓存为空会抛错 "precache is empty"，符合预期）

- [ ] **步骤 4：验证正常模式不受影响**

打开 `http://localhost:5173`（无 ?demo），正常创建角色进入游戏。
预期：和之前一样，正常走 AI 生成路径。

- [ ] **步骤 5：Commit**

---

### 任务 6：修改 contentGenerator.ts — isDemo 分叉

**文件：**
- 修改：`src/agents/contentGenerator.ts:1157-1165`（generateSceneContent 函数）

- [ ] **步骤 1：不需要修改**

经过分析，Demo 模式已在 orchestrator.ts 的 processTurn 入口完全接管，contentGenerator 的本地 fallback 在 demo 模式下不会被调用（因为 processTurn 提前 return 了）。

标记此任务为无需操作，删除。

---

### 任务 7：创建 DemoOverlay.tsx

**文件：**
- 创建：`src/demo/DemoOverlay.tsx`

- [ ] **步骤 1：编写组件代码**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from './DemoContext';
import {
  getCurrentPhase,
  getDemoPhaseIndex,
  getDemoPhaseCount,
  advancePhase,
  togglePause,
  isDemoPaused,
  resetDemo,
} from './demoOrchestrator';

export default function DemoOverlay() {
  const { isDemo } = useDemo();
  const [visible, setVisible] = useState(true);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [highlight, setHighlight] = useState('');
  const [narration, setNarration] = useState('');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [totalPhases, setTotalPhases] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);

  const refresh = useCallback(() => {
    const phase = getCurrentPhase();
    if (phase) {
      setPhaseLabel(phase.label);
      setHighlight(phase.highlight);
      setNarration(phase.narrationTech);
    }
    setPhaseIdx(getDemoPhaseIndex());
    setTotalPhases(getDemoPhaseCount());
    setPaused(isDemoPaused());
  }, []);

  useEffect(() => {
    if (!isDemo) return;
    refresh();
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [isDemo, refresh]);

  useEffect(() => {
    if (!isDemo || !visible) return;
    function onKey(e: KeyboardEvent) {
      switch (e.key.toLowerCase()) {
        case 'h':
          setVisible((v) => !v);
          break;
        case 'n':
          advancePhase();
          refresh();
          break;
        case 'p':
          togglePause();
          setPaused(isDemoPaused());
          break;
        case 'r':
          resetDemo();
          refresh();
          setElapsed(0);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDemo, visible, refresh]);

  if (!isDemo || !visible) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const remaining = Math.max(0, 180 - elapsed); // 3 min target

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 pointer-events-none z-50"
      >
        {/* 顶部状态栏 */}
        <div className="absolute top-0 left-0 right-0 bg-black/70 backdrop-blur-sm px-4 py-1.5 flex justify-between items-center text-xs text-white/90">
          <span>
            ⏱ 阶段: {phaseLabel} ({phaseIdx + 1}/{totalPhases})
            &nbsp;|&nbsp; 已用 {minutes}:{String(seconds).padStart(2, '0')}
            &nbsp;|&nbsp; 剩余约 {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
          <span className="text-amber-300">
            🎯 当前亮点: {highlight}
          </span>
        </div>

        {/* 底部旁白提示 */}
        <div className="absolute bottom-12 left-4 right-4">
          <div className="bg-blue-600/85 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-white">
            💬 旁白: {narration}
          </div>
        </div>

        {/* 右下角快捷键 */}
        <div className="absolute bottom-2 right-4 text-[10px] text-white/50">
          H 隐藏 | N 下一阶段 | P {paused ? '继续' : '暂停'} | R 重置
        </div>

        {/* 暂停指示器 */}
        {paused && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/90 px-4 py-2 rounded text-sm font-bold">
            ⏸ 已暂停
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **步骤 2：验证 TypeScript 编译**

运行：`npx tsc --noEmit --pretty false`
预期：PASS

- [ ] **步骤 3：Commit**

---

### 任务 8：修改 GameMain.tsx — 挂载 DemoOverlay

**文件：**
- 修改：`src/components/screens/GameMain.tsx`

- [ ] **步骤 1：导入 DemoOverlay**

在 `GameMain.tsx` 顶部 import 区域添加：

```tsx
import DemoOverlay from '../../demo/DemoOverlay';
```

- [ ] **步骤 2：在 JSX 中渲染 DemoOverlay**

在 `GameMain` 组件的 return 语句中，最外层的 `<div>` 内部最后（在 `</div>` 闭合标签之前）添加：

```tsx
<DemoOverlay />
```

- [ ] **步骤 3：验证 TypeScript 编译**

运行：`npx tsc --noEmit --pretty false`
预期：PASS

- [ ] **步骤 4：启动 dev server 验证叠加层**

运行：`npx vite --host`
打开 `http://localhost:5173?demo=true`
预期：进入游戏画面后能看到顶部半透明状态栏和底部旁白提示条。按 H 可以隐藏，再按 H 可以显示。

- [ ] **步骤 5：验证正常模式不显示叠加层**

打开 `http://localhost:5173`，进入游戏。
预期：无叠加层，和之前完全一样。

- [ ] **步骤 6：Commit**

---

### 任务 9：创建预缓存生成脚本

**文件：**
- 创建：`scripts/generate-precache.ts`

- [ ] **步骤 1：检查 tsconfig 是否支持 ts-node 执行脚本**

运行：`npx tsx --version`
预期：显示版本号。如果未安装：`npm install -D tsx`

- [ ] **步骤 2：编写生成脚本**

```typescript
import { callDeepSeek } from '../src/ai/deepseek';
import { buildContext } from './build-context-helper';
import { DEMO_PHASES, DEMO_PLAYER, DEMO_SCENE } from '../src/demo/demoConfig';
import { getSceneById } from '../src/data/scenes';
import { getSystemById } from '../src/data/systems';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const OUT_DIR = resolve(__dirname, '../src/demo/precache');
const OUT_FILE = resolve(OUT_DIR, 'demo_v1.json');

interface PrecacheEntry {
  version: string;
  generatedAt: string;
  events: Record<string, unknown>;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const events: Record<string, unknown> = {};
  const player = {
    ...DEMO_PLAYER,
    progress: {
      sceneType: DEMO_SCENE,
      sceneName: getSceneById(DEMO_SCENE)?.name ?? '',
      round: 0,
      age: 18,
      stage: 0,
    },
    history: [],
  };

  const scene = getSceneById(DEMO_SCENE);
  const system = getSystemById('devour_evolution');

  for (const phase of DEMO_PHASES) {
    console.log(`生成: ${phase.id} (${phase.label})...`);

    const prompt = buildPromptForPhase(phase.id, player, scene?.name ?? '', system?.name ?? '');
    try {
      const result = await callDeepSeek(prompt);
      events[phase.id] = result;
    } catch (e) {
      console.error(`生成 ${phase.id} 失败:`, e);
      console.log('使用占位数据...');
      events[phase.id] = createPlaceholderTurnResult(phase.id);
    }
  }

  const entry: PrecacheEntry = {
    version: 'demo_v1',
    generatedAt: new Date().toISOString(),
    events,
  };

  writeFileSync(OUT_FILE, JSON.stringify(entry, null, 2), 'utf-8');
  console.log(`预缓存已生成: ${OUT_FILE}`);
}

function buildPromptForPhase(
  phaseId: string,
  player: unknown,
  sceneName: string,
  systemName: string,
): string {
  return `[游戏场景生成]
场景: ${sceneName}
系统: ${systemName}
阶段: ${phaseId}
玩家属性: ${JSON.stringify((player as Record<string, unknown>).attributes)}
要求: 生成引人入胜的场景描述(200字以内)、4个策略性选择、以及系统消息。
返回JSON格式: {"sceneText":"...", "choices":[...], "systemMessage":"...", "event":null}`;
}

function createPlaceholderTurnResult(phaseId: string) {
  return {
    sceneText: `[${phaseId}] 演示内容加载中...`,
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

main().catch(console.error);
```

- [ ] **步骤 2（修正，实际步骤 3）：在 package.json 中添加 precache 脚本**

读取 `package.json` 的 scripts 部分，添加：

```json
"precache": "tsx scripts/generate-precache.ts"
```

- [ ] **步骤 3（实际步骤 4）：运行预缓存脚本**

运行：`npm run precache`
预期：脚本调用 DeepSeek API，逐条生成 5 个阶段的内容，写入 `src/demo/precache/demo_v1.json`。

- [ ] **步骤 4（实际步骤 5）：验证生成的 JSON 文件**

读取 `src/demo/precache/demo_v1.json`，确认：
- `version` 为 `"demo_v1"`
- `generatedAt` 为有效 ISO 时间戳
- `events` 包含 5 个 key：`char_create`、`turn_1`、`turn_2`、`climax_reveal`、`ending`
- 每个 event 有 `sceneText`、`choices`（4个）、`systemMessage`

- [ ] **步骤 5（实际步骤 6）：Commit**

---

### 任务 10：端到端 Demo 流程验证

**文件：**
- 无新建/修改，纯验证

- [ ] **步骤 1：启动 dev server**

运行：`npx vite --host`

- [ ] **步骤 2：完整走一遍 Demo 流程**

打开 `http://localhost:5173?demo=true`，按照演示脚本走完 5 个阶段：
1. 创建角色（使用最优属性）
2. 选择修仙世界
3. 绑定吞噬进化系统
4. 推进 2 回合
5. 观察叠加层状态栏和旁白提示

- [ ] **步骤 3：测试快捷键**

- 按 H：叠加层消失
- 再按 H：叠加层出现
- 按 N：跳下一阶段
- 按 P：暂停/继续
- 按 R：重置

- [ ] **步骤 4：测试异常情况**

- 删除 `demo_v1.json` 再进入 demo 模式 → 应显示 fallback 内容 + 控制台 warning
- 正常模式（无 ?demo）→ 功能完全不受影响

---

### 任务 11：DeepSeek API — 流式 SSE 响应

**文件：**
- 修改：`src/ai/deepseek.ts`

- [ ] **步骤 1：添加 stream 参数支持**

在 `src/ai/deepseek.ts` 中，修改 `callDeepSeek` 函数（约第 80 行附近），添加 `stream` 参数：

```typescript
interface DeepSeekCallOptions {
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

async function callDeepSeekStream(
  options: DeepSeekCallOptions,
): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: options.messages,
      stream: true,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
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

// 保留原非流式调用作为 fallback
async function callDeepSeekNonStream(
  options: DeepSeekCallOptions,
): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: options.messages,
      stream: false,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}
```

- [ ] **步骤 2：在 provider 接口中添加 stream 选项**

读取 `src/ai/provider.ts`，在 `AIProvider` 接口中添加可选的 `stream` 参数。

- [ ] **步骤 3：验证流式调用**

在浏览器 console 中手动测试或通过 unit test：
- 调用流式版本的 `callDeepSeekStream`
- 验证返回完整内容
- 对比非流式版本的延迟

- [ ] **步骤 4：Commit**

---

### 任务 12：上下文窗口管理优化

**文件：**
- 修改：`src/ai/deepseek.ts`
- 可能创建：`src/ai/contextManager.ts`

- [ ] **步骤 1：创建 contextManager**

```typescript
// src/ai/contextManager.ts

interface ContextSlot {
  role: 'system' | 'user';
  content: string;
}

interface WindowConfig {
  systemPromptTokens: number;   // ~500
  playerStateTokens: number;    // ~200
  historyTokens: number;        // ~1500
  currentContextTokens: number; // ~300
}

const DEFAULT_CONFIG: WindowConfig = {
  systemPromptTokens: 500,
  playerStateTokens: 200,
  historyTokens: 1500,
  currentContextTokens: 300,
};

function estimateTokens(text: string): number {
  // 粗略估算：中文约 1.5 字符/token，英文约 4 字符/token
  const chineseChars = (text.match(/[一-鿿]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

function summarizeHistory(
  history: string[],
  maxTokens: number,
): string {
  if (history.length <= 5) return history.join(' -> ');

  // 保留最近 3 条的原文，更早的做摘要
  const recent = history.slice(-3);
  const older = history.slice(0, -3);

  // 摘要：取最早的描述 + "...(中间省略)..." + 最近的
  if (older.length > 0) {
    return `${older[0].slice(0, 30)}...(${older.length}轮省略)... -> ${recent.join(' -> ')}`;
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
    { role: 'system', content: params.systemPrompt.slice(0, Math.floor(cfg.systemPromptTokens * 1.5)) },
    { role: 'user', content: `[角色状态]\n${params.playerState}` },
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

export { estimateTokens, DEFAULT_CONFIG };
```

- [ ] **步骤 2：将 contextManager 集成到 buildScenePrompt**

修改 `deepseek.ts` 中的 `buildScenePrompt` 函数，使用 `buildOptimizedContext` 替换手动拼接的字符串。

- [ ] **步骤 3：验证 token 估算**

在浏览器 console 中测试 `estimateTokens`，确认中英文混合文本的 token 估算在合理范围内（±20%）。

- [ ] **步骤 4：Commit**

---

### 任务 13：3 级容错体系

**文件：**
- 修改：`src/ai/deepseek.ts`

- [ ] **步骤 1：实现带重试的 API 调用包装器**

```typescript
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
      const delay = baseDelay * Math.pow(2, attempt); // 指数退避: 1s, 2s, 4s
      console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
```

- [ ] **步骤 2：实现 3 级调用策略**

```typescript
async function callWithFallback(
  streamFn: () => Promise<string>,
  nonStreamFn: () => Promise<string>,
  fallbackFn: () => string,
): Promise<{ content: string; usedFallback: boolean; level: 1 | 2 | 3 }> {
  // Level 1: 流式调用
  try {
    const content = await withRetry(streamFn, { maxRetries: 1, baseDelay: 500 });
    return { content, usedFallback: false, level: 1 };
  } catch (e) {
    console.warn('Streaming failed, falling back to non-streaming:', e);
  }

  // Level 2: 非流式重试
  try {
    const content = await withRetry(nonStreamFn, { maxRetries: 3, baseDelay: 1000 });
    return { content, usedFallback: false, level: 2 };
  } catch (e) {
    console.warn('Non-streaming failed, falling back to local templates:', e);
  }

  // Level 3: 本地模板
  return { content: fallbackFn(), usedFallback: true, level: 3 };
}
```

- [ ] **步骤 3：集成到现有的 generateScene 和 generateEvent 调用中**

在 `deepseek.ts` 的 provider 实现中，将现有的 try-catch 替换为 3 级 `callWithFallback` 调用。

- [ ] **步骤 4：验证容错行为**

- 正常网络 → Level 1 流式返回
- 断开网络 → 应降级到 Level 3 本地模板
- （可选）mock 超时 → 应触发 Level 2 重试

- [ ] **步骤 5：Commit**

---

### 任务 14：部署配置

**文件：**
- 创建：`scripts/deploy-cos.sh`
- 修改：`vite.config.ts`（如需调整 base 路径）
- 修改：`package.json`（添加 deploy 脚本）

- [ ] **步骤 1：创建部署脚本**

```bash
#!/bin/bash
# scripts/deploy-cos.sh — 部署到腾讯云 COS

set -e

echo "Building production..."
npm run build

echo "Uploading to COS..."
# 需要先安装 coscmd: pip install coscmd
# 配置: coscmd config -a <SecretId> -s <SecretKey> -b <Bucket> -r <Region>
coscmd upload -r dist/ /

echo "Refreshing CDN cache..."
coscmd purge /

echo "Deploy complete!"
echo "URL: https://<your-bucket>.cos.<region>.myqcloud.com/"
```

- [ ] **步骤 2：在 package.json 添加 deploy 脚本**

```json
"deploy": "bash scripts/deploy-cos.sh"
```

- [ ] **步骤 3：确保 vite.config.ts 的 base 路径正确**

检查 `vite.config.ts` 中 `base` 配置，确保生产构建的资源路径正确。如果是根路径部署（COS 静态网站），`base: '/'` 或 `base: './'` 即可。

- [ ] **步骤 4：生产构建验证**

运行：`npm run build`
预期：构建成功，dist/ 目录生成，JS 小于 500KB（gzip 后约 120KB）。

- [ ] **步骤 5：Commit**

---

### 任务 15：最终验证

**文件：** 无

- [ ] **步骤 1：构建验证**

运行：`npm run build`
预期：零错误

- [ ] **步骤 2：类型检查验证**

运行：`npx tsc --noEmit --pretty false`
预期：零错误

- [ ] **步骤 3：Demo 模式完整流程**

- `http://localhost:5173?demo=true` → 完整演示流程正常运转
- 快捷键测试通过
- 预缓存内容正常显示

- [ ] **步骤 4：正常模式不受影响**

- `http://localhost:5173` → 所有已有功能正常

- [ ] **步骤 5：Commit 所有剩余更改**

---

**实现优先级:**
- P0: 任务 1-10, 14-15（Demo 核心 + 部署）约 2.5 天
- P1: 任务 11-13（API 优化）约 2 天
- P2: 移动端适配 + Service Worker（如需，约 1 天）
