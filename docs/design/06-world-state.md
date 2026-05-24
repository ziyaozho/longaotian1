# 设计文档：世界状态与系统个性化

> 对应 ending.md.txt §3.1（world_state / system_state 部分）和 §5.2（系统对话个性化）

## 背景

ending.md.txt 要求每个玩家的世界是一个"有状态"的持续存在：当前地点、时间线、全局标记都在变化。同时，系统精灵（赛博嘴替）需要有稳定的性格，不能今天毒舌明天温柔。

当前项目的时间推进仅靠 `progress.round` 和 `progress.age` 两个数字，没有地点变化和全局事件标记。

## 目标

1. 世界状态（地点、时间线、全局标记）随回合自动推进
2. 每个系统有预设的 `dialogueStyle`，系统对话保持性格一致
3. 系统特有状态（如签到连续天数）正确维护
4. 全局标记可影响后续剧情走向

---

## 世界状态自动推进

文件：`src/engine/worldStateUpdater.ts`

### 时间线推进规则

```typescript
const TIMELINE_CYCLE = [
  '清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜', '黎明'
];

export function advanceTimeline(current: string, round: number): string {
  // 解析当前时间线，如 "第三天·下午"
  const match = current.match(/第(\d+)天·(.+)/);
  if (!match) return '第一天·清晨';

  const [, dayStr, phase] = match;
  const day = parseInt(dayStr, 10);
  const phaseIndex = TIMELINE_CYCLE.indexOf(phase);

  if (phaseIndex === -1) return `第${day}天·清晨`;

  const nextPhaseIndex = (phaseIndex + 1) % TIMELINE_CYCLE.length;
  const nextDay = nextPhaseIndex === 0 ? day + 1 : day;
  const nextPhase = TIMELINE_CYCLE[nextPhaseIndex];

  return `第${nextDay}天·${nextPhase}`;
}
```

**每回合自动推进一次。** 同时 `progress.age` 每 8 回合（一天）增加 1 岁。

### 地点更新规则

地点不由硬编码规则完全决定，而是：
1. AI 生成剧情时可指定 `locationChange`
2. 如果 AI 指定了地点变更，接受并更新
3. 如果 AI 未指定，地点保持不变
4. 校验层检查新地点是否与当前场景风格一致

```typescript
export function updateLocation(
  currentLocation: string,
  locationChange: string | undefined,
  sceneType: SceneType
): string {
  if (!locationChange) return currentLocation;

  // 简单校验：新地点不应与场景风格冲突
  // 校验逻辑在 hallucinationGuard.ts 中
  return locationChange;
}
```

### 全局标记维护

全局标记由 AI 在生成剧情时设置，或由游戏引擎在特定事件后自动设置：

```typescript
// 引擎自动设置的标记
const ENGINE_FLAGS = {
  first_system_activation: '系统首次激活时',
  first_death: '玩家首次濒死时',
  first_npc_encounter: '首次邂逅NPC时',
  first_combat_victory: '首次战斗胜利时',
  first_level_up: '首次升级时',
};
```

---

## 系统个性化

### 系统预设性格

在 `src/data/systems.ts` 中，为每个系统添加 `dialogueStyle` 和 `personalityDescription`：

```typescript
export interface SystemDefinition {
  id: string;
  name: string;
  description: string;
  // ... 现有字段
  dialogueStyle: string;           // 如 "毒舌吐槽"
  personalityDescription: string;  // 详细性格描述，用于AI prompt
  systemSpecificFields?: Record<string, unknown>; // 系统特有配置
}
```

**示例：**

```typescript
{
  id: 'check_in',
  name: '签到系统',
  description: '每日签到获得奖励',
  dialogueStyle: '毒舌吐槽',
  personalityDescription: '系统精灵"小签"，性格毒舌、傲娇、偶尔冒出一句土味情话。' +
    '发放奖励时会调侃宿主，如："叮！检测到宿主还在摸鱼，强制签到成功，' +
    '奖励‘打工人的怨念结晶’一颗，就问你感不感动？"',
  systemSpecificFields: {
    maxCheckInStreak: 30,
    rewardTiers: ['普通', '稀有', '史诗', '传说'],
  },
}
```

### 系统扩展状态维护

```typescript
// 签到系统特有状态
export function updateCheckInSystemState(
  current: ExtendedSystemState,
  didCheckIn: boolean
): ExtendedSystemState {
  if (!didCheckIn) return current;

  const streak = (current.checkInStreak || 0) + 1;
  const tiers = ['普通', '稀有', '史诗', '传说'];
  const tierIndex = Math.min(Math.floor(streak / 7), tiers.length - 1);

  return {
    ...current,
    checkInStreak: streak,
    nextRewardTier: tiers[tierIndex],
  };
}
```

---

## AI Prompt 系统性格注入

文件：`src/ai/contextManager.ts`

```typescript
export function buildSystemPersonaContext(
  system: PlayerSystem,
  extendedSystem: ExtendedSystemState,
  systemDef: SystemDefinition
): string {
  return `[系统精灵设定]\n` +
    `名称：${system.name}\n` +
    `性格：${extendedSystem.dialogueStyle || systemDef.dialogueStyle}\n` +
    `详细设定：${systemDef.personalityDescription}\n` +
    `当前状态：${extendedSystem.checkInStreak ? `连续签到${extendedSystem.checkInStreak}天` : '正常运作中'}`;
}
```

---

## 全局标记影响剧情

```typescript
// 在构建 prompt 时，将全局标记转化为剧情上下文
export function buildFlagContext(flags: Record<string, boolean>): string {
  const activeFlags = Object.entries(flags).filter(([, v]) => v);
  if (activeFlags.length === 0) return '';

  return `[已发生的关键事件]\n` +
    activeFlags.map(([k]) => `- ${FLAG_DESCRIPTIONS[k] || k}`).join('\n');
}

const FLAG_DESCRIPTIONS: Record<string, string> = {
  first_system_activation: '系统已经激活，宿主开始获得系统能力',
  first_death: '宿主曾经濒死，可能对生死有新的感悟',
  // ...
};
```

---

## 集成流程

### 每回合 worldState 更新

```
1. 调用 advanceTimeline 推进时间线
2. 处理 AI 返回的 locationChange（如有）
3. 处理 AI 返回的 flagChanges（如有）
4. 检查是否触发引擎自动标记（如首次升级等）
5. 更新 extendedSystem 的系统特有状态
6. 将更新后的 worldState 和 extendedSystem 写入 player
```

---

## 实现文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/engine/worldStateUpdater.ts` | 创建 | 时间线推进、地点更新、标记维护 |
| `src/data/systems.ts` | 修改 | 添加 dialogueStyle、personalityDescription |
| `src/ai/contextManager.ts` | 修改 | 新增系统性格和全局标记注入段 |
| `src/agents/orchestrator.ts` | 修改 | 每回合调用 worldState 更新 |
| `src/store/playerStore.ts` | 修改 | 新增 worldState 操作方法（见 01-core-state.md） |
| `src/narrative/systemDialogue.ts` | 修改 | 读取 extendedSystem.dialogueStyle |
