# 设计文档：核心状态重构

> 对应 ending.md.txt §3.1 —— 状态对象设计

## 背景

ending.md.txt 定义了一个精心设计的状态对象，作为整个系统的基石。当前项目的 `Player` 类型仅包含基础属性、装备、技能等，缺少故事记忆、NPC关系、世界状态、结局进度等关键字段。本设计文档定义需要新增的类型和 Store 扩展。

## 目标

1. 扩展 `Player` 类型，支持故事记忆、NPC、世界状态、系统个性化、结局进度
2. 所有新状态纳入 Zustand Store 管理，自动持久化到 localStorage
3. 保持向后兼容：旧存档无新字段时应安全降级

---

## 新增类型定义

所有类型定义在 `src/types/game.ts` 中新增。

### NPCState —— NPC 数据模型

```typescript
export interface NPCState {
  npcId: string;           // 唯一标识，如 "su_qing"
  name: string;            // 显示名称，如 "苏晴"
  role: string;            // 角色定位，如 "同班同学/潜在女主"
  personality: string;     // 性格描述，如 "外冷内热，好奇心重"
  relationship: number;    // 与玩家关系值，范围 -100 ~ 100
  memoryOfPlayer: string[];// 对玩家的记忆，保留最近 5 条
  currentGoal: string;     // 当前目标，如 "弄清楚林风突然变强的秘密"
  currentStatus: string;   // 当前状态，如 "在图书馆查阅资料"
  dialogueStyle: string;   // 对话风格，如 "略带审视，偶尔流露关心"
  isAlive: boolean;        // 是否存活（防止NPC复活幻觉）
  firstMetRound: number;   // 第几回合首次邂逅
}
```

**关系值语义：**

| 区间 | 关系 | 表现 |
|------|------|------|
| -100 ~ -50 | 敌对 | 可能攻击或阻碍玩家 |
| -49 ~ -10 | 冷淡 | 不理睬或防备 |
| -9 ~ 9 | 中立 | 普通交流 |
| 10 ~ 49 | 友善 | 愿意帮助玩家 |
| 50 ~ 79 | 亲近 | 主动关心，分享秘密 |
| 80 ~ 100 | 羁绊 | 生死与共，可触发结局条件 |

### StoryMemory —— 故事记忆

```typescript
export interface StoryMemory {
  longTermSummary: string;                          // 长期剧情摘要
  recentEvents: Array<{ round: number; event: string }>;     // 最近 5~8 回合事件
  decisionLog: Array<{ round: number; choice: string; result: string }>; // 玩家决策日志
}
```

**设计原理：**
- `longTermSummary` 替代冗长的完整历史，每次压缩后追加更新
- `recentEvents` 仅保留最近 5~8 回合的详细事件，保证短期连贯性
- `decisionLog` 为结局回顾提供素材，杜绝捏造

### WorldState —— 世界状态

```typescript
export interface WorldState {
  currentLocation: string;              // 当前地点，如 "金陵大学图书馆"
  timeline: string;                     // 时间线，如 "第三天·下午"
  globalFlags: Record<string, boolean>; // 全局标记，如 { first_system_activation: true }
}
```

### ExtendedSystemState —— 系统扩展状态

```typescript
export interface ExtendedSystemState {
  checkInStreak?: number;       // 签到连续天数（签到系统专用）
  nextRewardTier?: string;      // 下一奖励等级（签到系统专用）
  dialogueStyle: string;        // 系统精灵性格：毒舌/温柔/高冷/搞怪
  [key: string]: unknown;       // 其他系统特有字段可自由扩展
}
```

### EndingDefinition —— 结局定义

```typescript
export interface EndingDefinition {
  endingId: string;             // 唯一标识
  name: string;                 // 结局名称
  description: string;          // 结局描述
  victoryConditions: string[];  // 胜利条件表达式
  failConditions: string[];     // 失败条件表达式
  tone: string;                 // 结局基调：温馨/遗憾/热血/霸气...
}
```

**条件表达式语法（简单DSL）：**
- `"wealth >= 100000"` — 财富达到阈值
- `"npc:苏晴 >= 80"` — 与指定NPC关系值达到阈值
- `"has_item:九转金丹"` — 持有指定物品
- `"dead"` — 玩家死亡
- `"global:first_system_activation == true"` — 全局标记

### EndingProgress —— 结局进度

```typescript
export interface EndingProgress {
  targetEndingId: string;                  // 当前隐藏结局ID
  conditionStatus: Record<string, boolean | number>; // 各条件完成状态
  isFailed: boolean;                       // 是否已失败
}
```

---

## Player 接口扩展

在现有 `Player` 接口末尾追加以下字段：

```typescript
export interface Player {
  // ... 现有字段不变 ...

  // ===== ending.md.txt 新增状态 =====
  npcs: NPCState[];
  relationships: Record<string, number>;      // 关系值快速查询表
  storyMemory: StoryMemory;
  worldState: WorldState;
  extendedSystem: ExtendedSystemState;
  endingProgress: EndingProgress;
}
```

---

## PlayerStore 扩展

在 `src/store/playerStore.ts` 中新增以下方法：

### 故事记忆操作

```typescript
updateStoryMemory: (memory: Partial<StoryMemory>) => void;
addRecentEvent: (round: number, event: string) => void;
addDecisionLog: (round: number, choice: string, result: string) => void;
updateLongTermSummary: (summary: string) => void;
```

### NPC 操作

```typescript
addOrUpdateNPC: (npc: NPCState) => void;
updateNPCRelationship: (npcId: string, delta: number) => void;
setNPCLiving: (npcId: string, isAlive: boolean) => void;
updateNPCMemory: (npcId: string, memory: string) => void;
updateNPCStatus: (npcId: string, status: Partial<NPCState>) => void;
```

### 世界状态操作

```typescript
updateWorldState: (state: Partial<WorldState>) => void;
setGlobalFlag: (flag: string, value: boolean) => void;
advanceTimeline: () => void; // 自动推进时间线
```

### 结局操作

```typescript
initializeEnding: (endingId: string) => void;
updateEndingProgress: (progress: Partial<EndingProgress>) => void;
markEndingFailed: () => void;
```

### 系统个性化操作

```typescript
updateExtendedSystem: (state: Partial<ExtendedSystemState>) => void;
```

---

## 初始化默认值

在 `createInitialPlayer` 中，所有新增字段需有安全的默认值：

```typescript
export const createInitialPlayer = (
  name: string,
  attributes: Attributes,
  sceneType: string,
  systemId: string,
  systemName: string
): Player => ({
  // ... 现有字段 ...

  // ===== 新增字段默认值 =====
  npcs: [],
  relationships: {},
  storyMemory: {
    longTermSummary: '',
    recentEvents: [],
    decisionLog: [],
  },
  worldState: {
    currentLocation: '新手村',
    timeline: '第一天·清晨',
    globalFlags: {},
  },
  extendedSystem: {
    dialogueStyle: '毒舌', // 默认，后续根据系统类型覆盖
  },
  endingProgress: {
    targetEndingId: '',    // 开局时由 endingTracker 填充
    conditionStatus: {},
    isFailed: false,
  },
});
```

---

## 向后兼容策略

旧存档（无新字段）加载时的处理：

```typescript
// 在 storage.ts 的加载逻辑中
function migrateSaveData(player: Partial<Player>): Player {
  return {
    ...player,
    npcs: player.npcs ?? [],
    relationships: player.relationships ?? {},
    storyMemory: player.storyMemory ?? { longTermSummary: '', recentEvents: [], decisionLog: [] },
    worldState: player.worldState ?? { currentLocation: '新手村', timeline: '第一天·清晨', globalFlags: {} },
    extendedSystem: player.extendedSystem ?? { dialogueStyle: '毒舌' },
    endingProgress: player.endingProgress ?? { targetEndingId: '', conditionStatus: {}, isFailed: false },
  } as Player;
}
```

---

## 与现有系统的集成点

| 现有系统 | 集成方式 |
|---------|---------|
| `src/ai/contextManager.ts` | 构建 prompt 时读取 `storyMemory.longTermSummary`、`worldState`、`endingProgress` |
| `src/agents/orchestrator.ts` | 每回合结束时调用 `addRecentEvent`、`addDecisionLog`；邂逅时调用 `addOrUpdateNPC` |
| `src/narrative/systemDialogue.ts` | 读取 `extendedSystem.dialogueStyle` 决定系统语气 |
| `src/engine/memoryCompression.ts` | 读取 `storyMemory` 进行压缩，写入 `longTermSummary` |
| `src/engine/endingTracker.ts` | 读取 `endingProgress`、`stats`、`npcs` 计算进度 |
| `src/components/screens/GameMain.tsx` | 读取 `worldState`、`storyMemory`、`npcs` 展示面板 |
| `src/components/screens/GameOver.tsx` | 读取 `storyMemory.decisionLog`、`endingProgress` 生成回顾 |

---

## 实现注意事项

1. **类型导出**：所有新增类型需从 `src/types/index.ts` 统一导出，确保其他模块可引用
2. **Store 性能**：`relationships` 是 `npcs` 的派生数据，但独立维护以避免每次遍历数组
3. **持久化**：Zustand 的 `persist` 中间件会自动处理，无需额外工作
4. **不可变性**：所有 update 方法必须使用不可变更新（`...spread`），避免 React 不触发重渲染
