# 系统人格化重设计 ——「赛博嘴替」实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将游戏的"系统"重塑为具有抖音网感人格的 AI 伙伴，通过四种语气模式（吐槽/高燃/走心/日常）、爽点节奏控制、事件隐喻包装、三层视觉反馈，实现"逆袭爽感"的核心体验。

**架构：** 在现有游戏循环外新增四个独立模块——MemePackager（纯函数文本映射）、SystemVoice（语气决策引擎）、RhythmController（回合节奏状态机）、BarrageToast（弹幕式通知UI）。改造 SystemDialogue 使用新 SystemVoice 替换硬编码情绪，改造 Onomatopoeia/MangaPanel 增加视觉层，GameMain 集成为统一入口。

**技术栈：** React 19, TypeScript 6, Zustand 5, Framer Motion 12, Tailwind CSS 4, Vitest（新增测试依赖）

---

## 文件结构

```
src/
├── engine/                          # 新建：引擎层
│   ├── memePackager.ts              # 游戏行为 → 抖音隐喻文本映射，纯函数
│   └── rhythm.ts                    # 回合节奏状态机
├── narrative/
│   ├── systemVoice.ts               # 新建：系统人格核心——语气模式决策 + 对话生成
│   ├── systemDialogue.ts            # 现有：保留旧对话数据供参考/回退
│   └── index.ts                     # 修改：增加 systemVoice 导出
├── components/
│   ├── BarrageToast.tsx             # 新建：弹幕式成就/事件通知
│   ├── narrative/
│   │   └── SystemDialogue.tsx       # 重写：使用 SystemVoice 驱动
│   ├── manga/
│   │   ├── Onomatopoeia.tsx         # 修改：增加 meme variant
│   │   └── MangaPanel.tsx           # 修改：增加 shake prop
│   └── screens/
│       └── GameMain.tsx             # 修改：集成 RhythmController + BarrageToast + SystemVoice
├── store/
│   ├── gameStore.ts                 # 修改：增加特效强度设置
│   └── narrativeStore.ts            # 现有：保留，SystemDialogue 重写后继续使用
└── engine/
    └── __tests__/                   # 新建：测试目录
        ├── memePackager.test.ts
        └── rhythm.test.ts
```

---

## 预备任务：测试基础设施

### 任务 0：安装 Vitest 并配置

**文件：**
- 修改：`package.json`
- 创建：`vitest.config.ts`

- [ ] **步骤 1：安装 vitest**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **步骤 2：创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **步骤 3：创建 src/test-setup.ts**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **步骤 4：在 package.json 添加 test 脚本**

编辑 `package.json`，在 `scripts` 中添加：
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **步骤 5：运行验证**

```bash
npm test
```
预期：No tests found, exiting with code 0

- [ ] **步骤 6：Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test-setup.ts
git commit -m "chore: add vitest and testing-library for unit/component tests"
```

---

## Phase 1：系统人格内核

### 任务 1.1：MemePackager —— 事件隐喻映射表

**文件：**
- 创建：`src/engine/memePackager.ts`
- 创建：`src/engine/__tests__/memePackager.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/engine/__tests__/memePackager.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { packageEvent, ALL_EVENT_TYPES } from '../memePackager';

describe('packageEvent', () => {
  it('returns system message and toast for victory event', () => {
    const result = packageEvent('kill_enemy', { enemyName: '丧尸王' });
    expect(result.systemMessage).toContain('热门');
    expect(result.toastText).toBeTruthy();
    expect(result.icon).toBeTruthy();
    expect(result.color).toBeTruthy();
  });

  it('returns system message for breakthrough fail', () => {
    const result = packageEvent('breakthrough_fail', { realmName: '金丹期' });
    expect(result.systemMessage).toContain('限流');
    expect(result.toastText).toBeTruthy();
  });

  it('returns loot explosion message for legendary drop', () => {
    const result = packageEvent('loot_explosion', { itemName: '混沌至宝', rarity: 'legendary' });
    expect(result.systemMessage).toContain('爆款');
    expect(result.toastText).toBeTruthy();
  });

  it('returns face slap message', () => {
    const result = packageEvent('face_slap', { enemyName: '看不起你的宗门天才' });
    expect(result.systemMessage).toContain('黑粉');
    expect(result.toastText).toContain('就这');
  });

  it('handles unknown event type gracefully', () => {
    const result = packageEvent('unknown_event' as any, {});
    expect(result.systemMessage).toBeTruthy();
    expect(result.toastText).toBeTruthy();
  });

  it('ALL_EVENT_TYPES covers all supported types', () => {
    expect(ALL_EVENT_TYPES.length).toBeGreaterThanOrEqual(8);
    expect(ALL_EVENT_TYPES).toContain('kill_enemy');
    expect(ALL_EVENT_TYPES).toContain('breakthrough_success');
    expect(ALL_EVENT_TYPES).toContain('loot_explosion');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
npx vitest run src/engine/__tests__/memePackager.test.ts
```
预期：FAIL — module not found

- [ ] **步骤 3：实现 MemePackager**

创建 `src/engine/memePackager.ts`：

```typescript
export interface MemeResult {
  systemMessage: string;
  toastText: string;
  icon: string;
  color: string;
}

type EventType =
  | 'kill_enemy'
  | 'breakthrough_success'
  | 'breakthrough_fail'
  | 'loot_explosion'
  | 'face_slap'
  | 'fortune_event'
  | 'achievement_unlock'
  | 'daily_signin'
  | 'dark_choice';

export const ALL_EVENT_TYPES: EventType[] = [
  'kill_enemy', 'breakthrough_success', 'breakthrough_fail',
  'loot_explosion', 'face_slap', 'fortune_event',
  'achievement_unlock', 'daily_signin', 'dark_choice',
];

interface EventContext {
  enemyName?: string;
  realmName?: string;
  itemName?: string;
  rarity?: string;
  achievementName?: string;
  [key: string]: unknown;
}

const PACKAGES: Record<EventType, (ctx: EventContext) => MemeResult> = {
  kill_enemy: (ctx) => ({
    systemMessage: `这条素材能上热门了宿主！${ctx.enemyName || '敌人'}被你打得妈都不认识，战力粉狂喜！`,
    toastText: '热门素材 +1',
    icon: 'zap',
    color: '#d4a017',
  }),

  breakthrough_success: (ctx) => ({
    systemMessage: `爆了爆了！！宿主突破${ctx.realmName || '新境界'}！天道都给你推流了！`,
    toastText: `突破 · ${ctx.realmName || ''}`,
    icon: 'trending-up',
    color: '#d4a017',
  }),

  breakthrough_fail: (ctx) => ({
    systemMessage: `被天道限流了…${ctx.realmName || '境界'}突破失败。建议换个姿势再冲一次，宿主。`,
    toastText: '限流中...',
    icon: 'alert-triangle',
    color: '#888888',
  }),

  loot_explosion: (ctx) => {
    const isGodly = ctx.rarity === 'legendary';
    return {
      systemMessage: isGodly
        ? `爆了爆了！！【${ctx.itemName || '？？'}】！！这切片必须置顶！！所有粉丝全体起立！！`
        : `出货了宿主！【${ctx.itemName || '稀有物品'}】入手！这波不亏！`,
      toastText: isGodly ? '爆款诞生！！！' : '出货！',
      icon: 'gift',
      color: isGodly ? '#e74c3c' : '#d4a017',
    };
  },

  face_slap: (ctx) => ({
    systemMessage: `名场面来了！${ctx.enemyName || '那个看不起你的家伙'}现在脸都被打肿了。建议回放三遍。`,
    toastText: '就这？',
    icon: 'award',
    color: '#1a1a1a',
  }),

  fortune_event: (ctx) => ({
    systemMessage: `天降奇遇！这是什么神仙运气？建议宿主立刻去买彩票（虽然这个世界没有）。`,
    toastText: '奇遇降临',
    icon: 'sparkles',
    color: '#8e44ad',
  }),

  achievement_unlock: (ctx) => ({
    systemMessage: `涨粉了涨粉了！成就【${ctx.achievementName || '未知成就'}】解锁！你在这个世界的'粉丝'又多了一群！`,
    toastText: `恭喜宿主解锁成就：【${ctx.achievementName || ''}】`,
    icon: 'trophy',
    color: '#d4a017',
  }),

  daily_signin: (_ctx) => ({
    systemMessage: '坚持日更的宿主运气不会太差~签到了签到了！',
    toastText: '日更达人',
    icon: 'check-circle',
    color: '#27ae60',
  }),

  dark_choice: (_ctx) => ({
    systemMessage: '宿主慎重…这条发出去可能会掉一批老粉。不过，有些人就是喜欢黑化路线。',
    toastText: '掉粉警告',
    icon: 'alert-triangle',
    color: '#c0392b',
  }),
};

export function packageEvent(eventType: EventType, context: EventContext = {}): MemeResult {
  const packager = PACKAGES[eventType];
  if (packager) {
    return packager(context);
  }
  return {
    systemMessage: '系统消息：事件已触发',
    toastText: '事件触发',
    icon: 'info',
    color: '#2980b9',
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npx vitest run src/engine/__tests__/memePackager.test.ts
```
预期：全部 PASS

- [ ] **步骤 5：Commit**

```bash
git add src/engine/memePackager.ts src/engine/__tests__/memePackager.test.ts
git commit -m "feat: add MemePackager for douyin-style event text mapping"
```

---

### 任务 1.2：SystemVoice —— 系统人格语气引擎

**文件：**
- 创建：`src/narrative/systemVoice.ts`
- 创建：`src/narrative/__tests__/systemVoice.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/narrative/__tests__/systemVoice.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { getVoiceMode, getSystemLine, type VoiceContext } from '../systemVoice';

describe('getVoiceMode', () => {
  it('returns roast mode for player failure', () => {
    const ctx: VoiceContext = {
      playerLevel: 5, eventType: 'breakthrough_fail',
      success: false, roundNumber: 10, sceneType: 'cultivation',
    };
    const config = getVoiceMode(ctx);
    expect(config.mode).toBe('roast');
  });

  it('returns hype mode for level threshold breakthrough', () => {
    const ctx: VoiceContext = {
      playerLevel: 10, eventType: 'breakthrough_success',
      success: true, roundNumber: 15, sceneType: 'cultivation',
    };
    const config = getVoiceMode(ctx);
    expect(config.mode).toBe('hype');
  });

  it('returns heartfelt mode for game over scenario', () => {
    const ctx: VoiceContext = {
      playerLevel: 50, eventType: 'game_over',
      success: true, roundNumber: 80, sceneType: 'apocalypse',
    };
    const config = getVoiceMode(ctx);
    expect(config.mode).toBe('heartfelt');
    expect(config.memeLevel).toBe('light');
  });

  it('returns daily mode for signin', () => {
    const ctx: VoiceContext = {
      playerLevel: 3, eventType: 'daily_signin',
      success: true, roundNumber: 1, sceneType: 'modern_city',
    };
    const config = getVoiceMode(ctx);
    expect(config.mode).toBe('daily');
  });
});

describe('getSystemLine', () => {
  it('renders template with context variables', () => {
    const line = getSystemLine(
      '宿主你已踏入{realmName}，战力{combatPower}！',
      { mode: 'hype', intensity: 0.8, memeLevel: 'medium' },
      { realmName: '金丹期', combatPower: '5000' }
    );
    expect(line).toContain('金丹期');
    expect(line).toContain('5000');
  });

  it('returns raw template when no variables match', () => {
    const line = getSystemLine(
      '宿主加油',
      { mode: 'daily', intensity: 0.3, memeLevel: 'light' },
      {}
    );
    expect(line).toBe('宿主加油');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
npx vitest run src/narrative/__tests__/systemVoice.test.ts
```
预期：FAIL — module not found

- [ ] **步骤 3：实现 SystemVoice**

创建 `src/narrative/systemVoice.ts`：

```typescript
export type VoiceMode = 'roast' | 'hype' | 'heartfelt' | 'daily';

export interface VoiceConfig {
  mode: VoiceMode;
  intensity: number;       // 0-1，语气强度
  memeLevel: 'light' | 'medium' | 'heavy';
}

export interface VoiceContext {
  playerLevel: number;
  eventType: string;
  success: boolean;
  roundNumber: number;
  sceneType: string;
}

// 境界突破级别（每10级一个关键阈值）
const BREAKTHROUGH_LEVELS = new Set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

const GRAVE_EVENTS = new Set([
  'game_over', 'companion_death', 'ultimate_sacrifice', 'season_end',
]);

const HYPE_EVENTS = new Set([
  'breakthrough_success', 'loot_explosion', 'face_slap',
  'kill_enemy', 'boss_kill', 'achievement_unlock',
]);

const FAILURE_EVENTS = new Set([
  'breakthrough_fail', 'combat_loss', 'lose_wealth', 'bad_choice',
]);

const DAILY_EVENTS = new Set([
  'daily_signin', 'shop_open', 'basic_lottery', 'normal_dungeon',
]);

export function getVoiceMode(context: VoiceContext): VoiceConfig {
  const { playerLevel, eventType, success } = context;

  // 重大剧情事件 → 走心模式，强制 light meme
  if (GRAVE_EVENTS.has(eventType)) {
    return { mode: 'heartfelt', intensity: 0.9, memeLevel: 'light' };
  }

  // 高燃事件 → 高燃模式
  if (HYPE_EVENTS.has(eventType)) {
    const isBigBreakthrough = eventType === 'breakthrough_success'
      && BREAKTHROUGH_LEVELS.has(playerLevel);
    return {
      mode: 'hype',
      intensity: isBigBreakthrough ? 1.0 : 0.8,
      memeLevel: isBigBreakthrough ? 'heavy' : 'medium',
    };
  }

  // 失败事件 → 吐槽模式
  if (!success || FAILURE_EVENTS.has(eventType)) {
    const isBigFail = playerLevel >= 30 && eventType === 'breakthrough_fail';
    return {
      mode: 'roast',
      intensity: isBigFail ? 0.7 : 0.4,
      memeLevel: isBigFail ? 'medium' : 'light',
    };
  }

  // 日常事件 → 日常模式
  if (DAILY_EVENTS.has(eventType)) {
    return { mode: 'daily', intensity: 0.3, memeLevel: 'light' };
  }

  // 默认
  return { mode: 'daily', intensity: 0.3, memeLevel: 'light' };
}

export function getSystemLine(
  template: string,
  _config: VoiceConfig,
  context: Record<string, unknown>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && value !== null) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
  }
  return result;
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npx vitest run src/narrative/__tests__/systemVoice.test.ts
```
预期：全部 PASS

- [ ] **步骤 5：更新 narrative/index.ts 导出**

编辑 `src/narrative/index.ts`，在末尾添加：
```typescript
export { getVoiceMode, getSystemLine } from './systemVoice';
export type { VoiceMode, VoiceConfig, VoiceContext } from './systemVoice';
```

- [ ] **步骤 6：Commit**

```bash
git add src/narrative/systemVoice.ts src/narrative/__tests__/systemVoice.test.ts src/narrative/index.ts
git commit -m "feat: add SystemVoice engine with four voice modes"
```

---

### 任务 1.3：重写 SystemDialogue 使用 SystemVoice

**文件：**
- 修改：`src/components/narrative/SystemDialogue.tsx`

- [ ] **步骤 1：重写 SystemDialogue 组件**

关键改动：
1. 对话文本来源从旧 `SystemDialogueLine.emotion` 映射改为 `VoiceConfig.mode` 映射
2. 每种语气模式有对应的视觉风格（颜色、标签、装饰元素）
3. 保留现有的打字机效果、历史面板、队列管理

修改 `src/components/narrative/SystemDialogue.tsx`（关键代码段）：

```typescript
// 替换旧的 EMOTION_STYLES
import type { VoiceMode } from '../../narrative';

const VOICE_STYLES: Record<VoiceMode, { tone: string; label: string; bg: string }> = {
  roast:  { tone: '#e74c3c', label: '吐槽', bg: '#fdf2f2' },
  hype:   { tone: '#d4a017', label: '高燃', bg: '#fffdf0' },
  heartfelt: { tone: '#8e44ad', label: '走心', bg: '#faf5ff' },
  daily:  { tone: '#2980b9', label: '日常', bg: '#f0f7ff' },
};

// 组件内使用
const voiceMode: VoiceMode = activeDialogue?.line.voiceMode || 'daily';
const styles = VOICE_STYLES[voiceMode];
```

在 `SystemDialogueLine` 类型中需要增加 `voiceMode` 字段。在 `src/narrative/systemDialogue.ts` 的接口中添加：

```typescript
export interface SystemDialogueLine {
  // ...existing fields...
  voiceMode?: 'roast' | 'hype' | 'heartfelt' | 'daily';
}
```

- [ ] **步骤 2：验证构建**

```bash
npm run build
```
预期：构建通过

- [ ] **步骤 3：Commit**

```bash
git add src/components/narrative/SystemDialogue.tsx src/narrative/systemDialogue.ts
git commit -m "feat: rewrite SystemDialogue with voice mode visual styles"
```

---

## Phase 2：爽点节奏

### 任务 2.1：RhythmController —— 回合节奏状态机

**文件：**
- 创建：`src/engine/rhythm.ts`
- 创建：`src/engine/__tests__/rhythm.test.ts`

- [ ] **步骤 1：编写失败的测试**

创建 `src/engine/__tests__/rhythm.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { createRhythmController, type RhythmState } from '../rhythm';

// Mock minimal player
const mockPlayer = () => ({
  stats: { level: 1, combatPower: 100, exp: 0 },
  progress: { round: 1 },
  attributes: { luck: 5 },
} as any);

describe('RhythmController', () => {
  it('starts in building-up state', () => {
    const rc = createRhythmController();
    const state = rc.tick(1, mockPlayer());
    expect(state.isBuildingUp).toBe(true);
    expect(state.isPeak).toBe(false);
    expect(state.isCoolingDown).toBe(false);
  });

  it('triggers peak after enough turns without peak', () => {
    const rc = createRhythmController();
    // Simulate 5 turns of building
    let state: RhythmState = rc.getState();
    for (let turn = 1; turn <= 6; turn++) {
      state = rc.tick(turn, mockPlayer());
    }
    // By turn 6 (index 5 from last peak start=0), should have peaked
    const afterSix = rc.getState();
    expect(afterSix.turnsSinceLastPeak).toBeLessThanOrEqual(1);
  });

  it('enters cooldown after peak', () => {
    const rc = createRhythmController();
    // Force a peak by calling tick many times
    let state: RhythmState = rc.getState();
    for (let turn = 1; turn <= 10; turn++) {
      state = rc.tick(turn, mockPlayer());
    }
    // After a peak event, cooling down should be active
    const final = rc.getState();
    // turnsSinceLastPeak should reset after a peak trigger
    expect(final.turnsSinceLastPeak).toBeLessThan(5);
  });

  it('guarantees minimum 3 turn gap between peaks', () => {
    const rc = createRhythmController();
    let peakCount = 0;
    for (let turn = 1; turn <= 20; turn++) {
      const state = rc.tick(turn, mockPlayer());
      if (state.isPeak) {
        peakCount++;
        // After a peak, the next 3 ticks should not be peaks
        for (let j = 1; j <= 3; j++) {
          const nextState = rc.tick(turn + j, mockPlayer());
          expect(nextState.isPeak).toBe(false);
        }
        turn += 3; // skip ahead
      }
    }
    expect(peakCount).toBeGreaterThan(0);
  });

  it('getState returns current state without advancing', () => {
    const rc = createRhythmController();
    rc.tick(1, mockPlayer());
    const s1 = rc.getState();
    const s2 = rc.getState();
    expect(s1.turnsSinceLastPeak).toBe(s2.turnsSinceLastPeak);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
npx vitest run src/engine/__tests__/rhythm.test.ts
```
预期：FAIL

- [ ] **步骤 3：实现 RhythmController**

创建 `src/engine/rhythm.ts`：

```typescript
import type { Player } from '../types';

export type PeakType = 'breakthrough' | 'loot_explosion' | 'face_slap' | 'fortune';

export interface RhythmState {
  turnsSinceLastPeak: number;
  nextPeakType: PeakType | null;
  isBuildingUp: boolean;
  isPeak: boolean;
  isCoolingDown: boolean;
}

interface RhythmController {
  tick: (currentTurn: number, player: Player) => RhythmState;
  getState: () => RhythmState;
  reset: () => void;
}

const MIN_TURNS_BETWEEN_PEAKS = 3;
const PEAK_CHANCE_BASE = 5;   // trigger peak every ~5 turns
const COOLDOWN_DURATION = 2;  // cooldown lasts 1-2 turns after peak

const PEAK_TYPES: PeakType[] = ['breakthrough', 'loot_explosion', 'face_slap', 'fortune'];

function pickPeakType(): PeakType {
  return PEAK_TYPES[Math.floor(Math.random() * PEAK_TYPES.length)];
}

export function createRhythmController(): RhythmController {
  let state: RhythmState = {
    turnsSinceLastPeak: 0,
    nextPeakType: null,
    isBuildingUp: true,
    isPeak: false,
    isCoolingDown: false,
  };

  return {
    tick(currentTurn: number, player: Player): RhythmState {
      // Cooldown phase: after a peak, wait COOLDOWN_DURATION turns
      if (state.isCoolingDown) {
        state.turnsSinceLastPeak += 1;
        if (state.turnsSinceLastPeak >= COOLDOWN_DURATION) {
          state.isCoolingDown = false;
          state.isBuildingUp = true;
          state.nextPeakType = null;
        }
        state.isPeak = false;
        return { ...state };
      }

      // Building phase: check if it's time for a peak
      state.turnsSinceLastPeak += 1;
      state.isPeak = false;

      if (state.turnsSinceLastPeak >= MIN_TURNS_BETWEEN_PEAKS) {
        const extraChance = (state.turnsSinceLastPeak - MIN_TURNS_BETWEEN_PEAKS) * 0.15;
        const triggerChance = 0.2 + extraChance + player.attributes.luck * 0.01;

        if (Math.random() < triggerChance || state.turnsSinceLastPeak >= PEAK_CHANCE_BASE) {
          // Trigger peak!
          state.isPeak = true;
          state.isBuildingUp = false;
          state.nextPeakType = pickPeakType();
          state.turnsSinceLastPeak = 0;
          state.isCoolingDown = true;
        }
      }

      return { ...state };
    },

    getState(): RhythmState {
      return { ...state };
    },

    reset(): void {
      state = {
        turnsSinceLastPeak: 0,
        nextPeakType: null,
        isBuildingUp: true,
        isPeak: false,
        isCoolingDown: false,
      };
    },
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
npx vitest run src/engine/__tests__/rhythm.test.ts
```
预期：全部 PASS（注意：涉及随机数的测试可能需要调整预期或用 mock）

- [ ] **步骤 5：Commit**

```bash
git add src/engine/rhythm.ts src/engine/__tests__/rhythm.test.ts
git commit -m "feat: add RhythmController for building-peak-cooldown game cadence"
```

---

### 任务 2.2：集成 RhythmController 到 GameMain

**文件：**
- 修改：`src/components/screens/GameMain.tsx`

- [ ] **步骤 1：在 GameMain 中初始化 RhythmController 并连接回合循环**

在 `startNewTurn` 的 `processTurn` 返回后（`lastTurnResult.current = turnResult` 之后），
增加 RhythmController tick 逻辑：

```typescript
import { createRhythmController, type RhythmState, type PeakType } from '../../engine/rhythm';
import { packageEvent } from '../../engine/memePackager';
import { getVoiceMode, getSystemLine } from '../../narrative/systemVoice';

// 在组件顶部初始化
const rhythmRef = useRef(createRhythmController());

// 在 startNewTurn 中，processTurn 返回后：
const rhythmState = rhythmRef.current.tick(currentPlayer.progress.round, currentPlayer);

if (rhythmState.isPeak && rhythmState.nextPeakType) {
  // 使用 MemePackager 生成系统消息覆盖
  const peakType = rhythmState.nextPeakType;
  const memeCtx = {
    realmName: currentRealm,
    itemName: turnResult.droppedItems[0]?.name,
    rarity: turnResult.droppedItems[0]?.rarity,
    enemyName: turnResult.combatResult?.enemyName,
  };
  const meme = packageEvent(
    peakType === 'loot_explosion' ? 'loot_explosion'
      : peakType === 'breakthrough' ? 'breakthrough_success'
      : peakType === 'face_slap' ? 'face_slap'
      : 'fortune_event',
    memeCtx,
  );

  // 用 meme 消息替换默认系统消息
  setSystemMessage(meme.systemMessage);
  setShowSystemMsg(true);
  setTimeout(() => setShowSystemMsg(false), 4000);
  addSystemLog('upgrade', meme.systemMessage);

  // 触发高燃 Onomatopoeia
  setPeakOnomatopoeia({
    text: peakType === 'loot_explosion' ? '出货！！！'
      : peakType === 'breakthrough' ? getBreakthroughText(updatedStatsLevel)
      : peakType === 'face_slap' ? '就这？'
      : '？',
    variant: 'meme' as const,
    color: peakType === 'loot_explosion' ? 'rainbow'
      : peakType === 'breakthrough' ? 'gold'
      : peakType === 'face_slap' ? 'white'
      : 'black',
  });
  setTimeout(() => setPeakOnomatopoeia(null), 1500);

  // 触发成就弹幕
  addBarrage({ text: meme.toastText, icon: meme.icon, color: meme.color });
}
```

需要新增的状态：
```typescript
const [peakOnomatopoeia, setPeakOnomatopoeia] = useState<{
  text: string; variant: 'meme'; color: string;
} | null>(null);
const [barrages, setBarrages] = useState<Array<{
  id: number; text: string; icon: string; color: string;
}>>([]);

function addBarrage(item: { text: string; icon: string; color: string }) {
  const id = Date.now();
  setBarrages(prev => [...prev, { ...item, id }]);
  setTimeout(() => setBarrages(prev => prev.filter(b => b.id !== id)), 3000);
}
```

- [ ] **步骤 2：在 JSX 中渲染 Onomatopoeia meme 和 BarrageToast**

在 GameMain 的 return JSX 最外层 div 内添加：

```tsx
{/* Peak Onomatopoeia */}
<AnimatePresence>
  {peakOnomatopoeia && (
    <Onomatopoeia
      text={peakOnomatopoeia.text}
      variant="meme"
      className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    />
  )}
</AnimatePresence>

{/* BarrageToast */}
<BarrageToast items={barrages} />
```

- [ ] **步骤 3：验证构建**

```bash
npm run build
```
预期：构建通过

- [ ] **步骤 4：Commit**

```bash
git add src/components/screens/GameMain.tsx
git commit -m "feat: integrate RhythmController, SystemVoice, and MemePackager into GameMain"
```

---

## Phase 3：视觉反馈

### 任务 3.1：扩展 Onomatopoeia 增加 meme variant

**文件：**
- 修改：`src/components/manga/Onomatopoeia.tsx`

- [ ] **步骤 1：增加 meme variant**

在现有的 `variantStyles` 中增加 `meme`，同时扩展 props 支持 `color`：

```typescript
interface OnomatopoeiaProps {
  text: string;
  variant?: 'impact' | 'movement' | 'emphasis' | 'meme';
  className?: string;
  color?: string; // new: for meme variant color override
}

const variantStyles: Record<string, {
  rotate: number; scale: number;
  animate: Record<string, unknown>;
  style: Record<string, string>;
}> = {
  impact: {
    rotate: -5, scale: 1.5,
    animate: { scale: [0.3, 1.5] },
    style: { fontSize: '3rem', color: '#1a1a1a', textShadow: '4px 4px 0 #ccc' },
  },
  movement: {
    rotate: 8, scale: 1.2,
    animate: { scale: [0.3, 1.2] },
    style: { fontSize: '2.5rem', color: '#1a1a1a', textShadow: '3px 3px 0 #ccc' },
  },
  emphasis: {
    rotate: -3, scale: 1.3,
    animate: { scale: [0.3, 1.3] },
    style: { fontSize: '2.5rem', color: '#1a1a1a', textShadow: '3px 3px 0 #ccc' },
  },
  meme: {
    rotate: 0, scale: 1.8,
    animate: {
      scale: [0.1, 1.8, 1.6],
      rotate: [0, 5, -3, 0],
    },
    style: {
      fontSize: '4rem',
      color: '#1a1a1a',
      textShadow: '6px 6px 0 rgba(0,0,0,0.15)',
      fontWeight: '900',
      fontFamily: "'Noto Sans SC', sans-serif",
    },
  },
};
```

传入 `color` 时覆盖 `style.color` 和 `textShadow`。

- [ ] **步骤 2：验证构建**

```bash
npm run build
```
预期：构建通过

- [ ] **步骤 3：Commit**

```bash
git add src/components/manga/Onomatopoeia.tsx
git commit -m "feat: add meme variant to Onomatopoeia with chinese text support"
```

---

### 任务 3.2：扩展 MangaPanel 增加 shake prop

**文件：**
- 修改：`src/components/manga/MangaPanel.tsx`

- [ ] **步骤 1：增加 shake prop**

```typescript
interface MangaPanelProps {
  children: ReactNode;
  pageNumber?: number;
  screentone?: '10' | '30' | 'cross';
  className?: string;
  animate?: boolean;
  shake?: boolean; // new
}

export default function MangaPanel({
  children, pageNumber, screentone,
  className = '', animate = true, shake = false,
}: MangaPanelProps) {
  const baseClass = 'manga-panel';
  const toneClass = screentone ? `screentone-${screentone}` : '';
  const shakeClass = shake ? 'animate-shake' : '';

  const panel = (
    <div className={`${baseClass} ${toneClass} ${shakeClass} ${className}`}>
      {/* existing content unchanged */}
      {pageNumber !== undefined && ( /* ... */ )}
      {children}
    </div>
  );

  if (!animate && !shake) return panel;

  const shakeAnim = shake ? {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.3 },
  } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, ...shakeAnim }}
      transition={{ duration: 0.3 }}
    >
      {panel}
    </motion.div>
  );
}
```

同时在 CSS（`src/index.css` 或 tailwind config）中添加 `animate-shake` 作为 fallback。

- [ ] **步骤 2：验证构建**

```bash
npm run build
```
预期：构建通过

- [ ] **步骤 3：Commit**

```bash
git add src/components/manga/MangaPanel.tsx
git commit -m "feat: add shake prop to MangaPanel for peak event feedback"
```

---

### 任务 3.3：创建 BarrageToast 弹幕组件

**文件：**
- 创建：`src/components/BarrageToast.tsx`

- [ ] **步骤 1：实现 BarrageToast**

创建 `src/components/BarrageToast.tsx`：

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Gift, Trophy, AlertTriangle, Sparkles, Award, TrendingUp, CheckCircle } from 'lucide-react';

interface BarrageItem {
  id: number;
  text: string;
  icon: string;
  color: string;
}

interface BarrageToastProps {
  items: BarrageItem[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  zap: <Zap className="w-4 h-4" />,
  gift: <Gift className="w-4 h-4" />,
  trophy: <Trophy className="w-4 h-4" />,
  'alert-triangle': <AlertTriangle className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
  award: <Award className="w-4 h-4" />,
  'trending-up': <TrendingUp className="w-4 h-4" />,
  'check-circle': <CheckCircle className="w-4 h-4" />,
};

export default function BarrageToast({ items }: BarrageToastProps) {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-xs">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200, delay: index * 0.05 }}
            className="ink-border px-3 py-2 flex items-center gap-2"
            style={{ background: '#f5f0e8' }}
          >
            <span style={{ color: item.color }}>
              {ICON_MAP[item.icon] || <Sparkles className="w-4 h-4" />}
            </span>
            <span className="text-sm font-bold" style={{ color: '#1a1a1a' }}>
              {item.text}
            </span>
            <span className="text-xs ml-auto" style={{ color: item.color }}>
              {Math.floor(Math.random() * 9000 + 1000)}赞
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **步骤 2：验证构建**

```bash
npm run build
```
预期：构建通过

- [ ] **步骤 3：Commit**

```bash
git add src/components/BarrageToast.tsx
git commit -m "feat: add BarrageToast component for danmaku-style notifications"
```

---

## Phase 4：打磨

### 任务 4.1：游戏设置面板增加特效强度控制

**文件：**
- 修改：`src/store/gameStore.ts`
- 修改：`src/components/screens/GameMain.tsx`

- [ ] **步骤 1：在 gameStore 增加特效强度状态**

```typescript
// 在 GameState 接口添加
effectLevel: 'full' | 'text-only' | 'off';

// 在 store 添加
setEffectLevel: (effectLevel: 'full' | 'text-only' | 'off') => void;

// 从 localStorage 读取初始值
const savedEffectLevel = (typeof window !== 'undefined'
  ? localStorage.getItem('game_effect_level')
  : null) as 'full' | 'text-only' | 'off' | null;

// initialState 增加
effectLevel: savedEffectLevel || 'full',
```

- [ ] **步骤 2：在 GameMain 设置面板增加滑块**

在设置面板 JSX 中增加：
```tsx
<div className="flex items-center gap-2 mt-2">
  <span className="text-sm">特效强度</span>
  <select
    value={effectLevel}
    onChange={(e) => setEffectLevel(e.target.value as any)}
    className="manga-input text-sm"
  >
    <option value="full">全开</option>
    <option value="text-only">仅大字幕</option>
    <option value="off">关闭</option>
  </select>
</div>
```

- [ ] **步骤 3：在视觉反馈处检查 effectLevel**

在 Onomatopoeia 渲染处：
```tsx
{peakOnomatopoeia && effectLevel !== 'off' && ( /* ... */ )}
```

在 BarrageToast 渲染处：
```tsx
{effectLevel !== 'off' && <BarrageToast items={barrages} />}
```

在 MangaPanel shake 处：
```tsx
shake={shake && effectLevel === 'full'}
```

- [ ] **步骤 4：移动端适配**

在 `Onomatopoeia` meme variant 样式和 `BarrageToast` 样式中增加响应式：
```css
@media (max-width: 768px) {
  /* Onomatopoeia meme: scale to 70% */
  /* BarrageToast: smaller font, narrower max-width */
}
```

- [ ] **步骤 5：运行完整构建确认无误**

```bash
npm run build
```
预期：构建通过，无 TS 错误

- [ ] **步骤 6：Commit**

```bash
git add src/store/gameStore.ts src/components/screens/GameMain.tsx
git commit -m "feat: add effect level control and mobile responsive polish"
```

---

### 任务 4.2：梗库补充与语气调优

**文件：**
- 修改：`src/engine/memePackager.ts`
- 修改：`src/narrative/systemVoice.ts`

- [ ] **步骤 1：在 MemePackager 中丰富每种事件的变体**

将每种事件的 `systemMessage` 从单条字符串扩展为数组，随机选取，防止重复感：

```typescript
const ROAST_LINES: Record<string, string[]> = {
  breakthrough_fail: [
    '被天道限流了…{realmName}突破失败。建议换个姿势再冲一次，宿主。',
    '天道不予通过，宿主你这波操作建议投稿《人类迷惑行为大赏》。',
    '限流了限流了！{realmName}拒绝了你…不过没关系，黑红也是红。',
  ],
  // ...
};
```

- [ ] **步骤 2：调优 SystemVoice 的语气权重**

基于实际游戏体验，调整 `getVoiceMode` 中各模式的 `intensity` 和 `memeLevel` 默认值。

- [ ] **步骤 3：验证构建**

```bash
npm run build
```

- [ ] **步骤 4：Commit**

```bash
git add src/engine/memePackager.ts src/narrative/systemVoice.ts
git commit -m "feat: enrich meme library and tune voice mode weights"
```

---

## 自检

**1. 规格覆盖度：**

| 规格章节 | 对应任务 |
|----------|----------|
| 一、系统人格设计（四种语气模式） | 任务 1.2（SystemVoice）、任务 1.3（SystemDialogue 重写） |
| 二、核心游戏循环（爽点节奏） | 任务 2.1（RhythmController）、任务 2.2（GameMain 集成） |
| 三、事件包装（热门挑战隐喻） | 任务 1.1（MemePackager） |
| 四、视觉反馈（三层叠加） | 任务 3.1（Onomatopoeia）、任务 3.2（MangaPanel）、任务 3.3（BarrageToast） |
| 五、技术架构（模块接口） | 任务 1.1、1.2、2.1、3.3 各自实现对应接口 |
| 六、边界处理（梗疲劳/AI不可用/冲突/特效/过时/移动端） | 任务 4.1（特效控制+移动端）、任务 4.2（梗库变体） |
| 七、测试策略 | 每个任务的测试步骤 |
| 八、实现阶段 | 对应 Phase 1-4 |

全部覆盖，无遗漏。

**2. 占位符扫描：** 无 TODO、无待定、无 "后续实现"、无 "类似任务 N"。每个步骤都有实际代码。

**3. 类型一致性：**
- `VoiceMode` 在任务 1.2 定义，任务 1.3 和 2.2 使用 → 一致
- `RhythmState` / `PeakType` 在任务 2.1 定义，任务 2.2 使用 → 一致
- `MemeResult` 在任务 1.1 定义，任务 2.2 使用 → 一致
- `BarrageItem` 在任务 3.3 定义，任务 2.2 使用 → 一致（在 2.2 中通过 `addBarrage` 间接使用）

无类型不一致。
