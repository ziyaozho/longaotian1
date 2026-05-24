# 系统人格化重设计 ——「赛博嘴替」

## 目标

将游戏的"系统"重塑为抖音原生人格——一个用网感语言吐槽、整活、陪伴玩家走完逆袭人生的 AI 伙伴。在"逆袭成长爽感"的主轴上，注入抖音式的表达节奏和审美。

## 设计原则

| 原则 | 含义 |
|------|------|
| **系统即主播** | 系统对话采用抖音评论区语感——有梗、有节奏、有情绪起伏 |
| **爽点可视化** | 每个高光时刻用大字幕+特效呈现，像短视频的"高能片段" |
| **梗为佐料** | 梗服务于叙事和氛围，永远让位于"逆袭成长"的主线，不喧宾夺主 |

---

## 一、系统人格设计

### 人格定位：「赛博嘴替」

一个又损又护的 AI 伙伴——毒舌吐槽玩家的菜鸡操作，关键时刻永远站在玩家这边。说话风格类似抖音评论区的高赞回复：犀利、有梗、三秒抓住注意力。

### 四种语气模式

| 模式 | 触发场景 | 语气特征 |
|------|----------|----------|
| **吐槽模式** | 玩家失败 / 平庸选择 | 毒舌、调侃、反转式安慰 |
| **高燃模式** | 突破境界 / 爆出稀有物品 / 反杀 | 热血、短句连击、大字报式 |
| **走心模式** | 关键剧情节点 / 角色死亡 / 赛季终局 | 收起玩梗，真诚走心 |
| **日常模式** | 签到 / 商店 / 一般回合 | 轻吐槽 + 小鼓励 |

### 梗的使用规则

- **允许**：融合进语境的梗（"宿主你这是在玩一种很新的修仙"）、句式模仿（"重生之我在抽奖池里当非酋"）
- **禁止**：直接复制粘贴网络段子、使用梗作为核心笑点、在严肃剧情中强行玩梗

---

## 二、核心游戏循环——「爽点节奏」

### 循环结构

```
蓄力期（2-4 回合）  →  爆发点（每 5 回合至少一次）  →  回味期（1-2 回合）
日常修炼 / 小任务       突破 / 大爆掉落 / 打脸 / 奇遇    结算 + 系统走心点评
系统：日常模式           系统：高燃模式 + 全屏特效       系统：走心模式
```

### 爆发点类型

- **突破境界**：等级跨过关键阈值，系统高燃播报 + 新能力解锁预告
- **大爆掉落**：爆出史诗/传说物品，系统反应比玩家还激动
- **打脸名场面**：之前看不起玩家的 NPC/敌人被碾压，系统回放对比
- **奇遇事件**：触发特殊剧情，带抖音式叙事包装

### 与现有系统的关系

保留 `processTurn` / `processChoice` / `updatePlayerAfterTurn` 逻辑，新增 `RhythmController` 模块在回合间插入爆发点检测和包装。

---

## 三、事件包装——「热门挑战」隐喻

| 游戏行为 | 包装隐喻 | 系统播报风格 |
|----------|----------|-------------|
| 击杀强敌 | 「热门素材」 | "这条素材能上热门了宿主！" |
| 突破失败 | 「限流」 | "被天道限流了…建议换个姿势再冲一次" |
| 抽到稀有物品 | 「爆款」 | "爆了爆了！！" |
| NPC 敌对 | 「黑粉」 | "有黑粉闻着味来了" |
| 获得称号/成就 | 「涨粉」 | "名声+1，你在这个世界的'粉丝'又多了一群" |
| 连续签到 | 「日更达人」 | "坚持日更的宿主运气不会太差" |
| 属性突破 | 「打破天花板」 | "这数据…天道都给你推流了！" |
| 黑暗选择 | 「掉粉警告」 | "宿主慎重，这条发出去可能会掉一批老粉" |

约束：隐喻只用于系统对话和通知文本，不侵入核心叙事。场景描述保持网文风格。

---

## 四、视觉反馈——三层叠加

### 第一层：大字幕横幅

已有 `Onomatopoeia` 组件扩展 `variant: 'meme'`，爆发点触发时屏幕划过日漫式大字 + 网感文案，停留 1.5 秒：

- 突破境界 → 「化神了！！！」（金色 + 抖动）
- 大爆掉落 → 「出货！！！」（彩虹色 + 弹跳）
- 打脸名场面 → 「就这？」（白色 + 缓慢定格）
- 奇遇事件 → 「？」（黑色 + 放大消失）

### 第二层：弹幕式成就解锁

新建 `BarrageToast` 组件，成就从右向左滑入，多条叠加。格式：「恭喜宿主解锁成就：【xxx】」，带点赞数。

### 第三层：节奏震动

`MangaPanel` 增加 `shake` prop，仅在大级别爆发点时触发（传说掉落 / 满级 / 世界BOSS），每次 0.3s。

---

## 五、技术架构

### 新增模块

| 模块 | 位置 | 职责 |
|------|------|------|
| `RhythmController` | `src/engine/rhythm.ts` | 追踪回合计数，检测爆发点，返回爆发点类型和参数 |
| `SystemVoice` | `src/narrative/systemVoice.ts` | 系统人格核心：根据语气模式和上下文生成对话文本 |
| `BarrageToast` | `src/components/BarrageToast.tsx` | 弹幕式成就/事件通知组件 |
| `MemePackager` | `src/engine/memePackager.ts` | 游戏行为→抖音隐喻文本映射，纯函数 |

### 改造模块

| 模块 | 改动内容 |
|------|----------|
| `GameMain.tsx` | 集成 RhythmController + BarrageToast，调用 SystemVoice 替换硬编码系统消息 |
| `SystemDialogue.tsx` | 重写为使用 SystemVoice 输出，增加语气模式对应的视觉变体 |
| `Onomatopoeia.tsx` | 增加 `variant: 'meme'`，支持中文大字幕和更多动效预设 |
| `MangaPanel.tsx` | 增加 `shake` prop |

### 核心接口

```typescript
// RhythmController
interface RhythmState {
  turnsSinceLastPeak: number;
  nextPeakType: PeakType | null;
  isBuildingUp: boolean;
  isPeak: boolean;
  isCoolingDown: boolean;
}
type PeakType = 'breakthrough' | 'loot_explosion' | 'face_slap' | 'fortune';

function tickRhythm(currentTurn: number, player: Player): RhythmState;
function getPeakEvent(type: PeakType, player: Player): GameEvent;

// SystemVoice
type VoiceMode = 'roast' | 'hype' | 'heartfelt' | 'daily';
interface VoiceConfig {
  mode: VoiceMode;
  intensity: number;
  memeLevel: 'light' | 'medium' | 'heavy';
}

interface VoiceContext {
  playerLevel: number;
  playerStats: Stats;
  eventType: string;
  success: boolean;
  roundNumber: number;
  sceneType: string;
}

function getSystemLine(template: string, config: VoiceConfig, context: Record<string, unknown>): string;
function getVoiceMode(context: VoiceContext): VoiceConfig;

// MemePackager
function packageEvent(eventType: string, context: Record<string, unknown>): {
  systemMessage: string;
  toastText: string;
  icon: string;
  color: string;
};
```

---

## 六、边界处理

| 场景 | 处理 |
|------|------|
| 梗疲劳 | `memeLevel` 三级可调，走心模式下强制 light |
| AI 不可用 | MemePackager 使用纯本地模板，SystemVoice 模板化优先于 AI |
| 爆发点冲突 | RhythmController 保证间隔至少 3 回合，不覆盖进行中的事件 |
| 关闭特效 | 设置面板增加「特效强度」滑块（全开 / 仅大字幕 / 关闭），存 localStorage |
| 梗过时 | 隐喻映射表集中在 `memePackager.ts`，作为配置表可独立更新 |
| 移动端 | BarrageToast + Onomatopoeia 在 < 768px 下缩放至 70% |

---

## 七、测试策略

| 层级 | 内容 | 工具 |
|------|------|------|
| 单元 | RhythmController 逻辑、MemePackager 映射表、SystemVoice 四种模式输出 | Vitest |
| 组件 | BarrageToast 动画、Onomatopoeia meme variant、MangaPanel shake | React Testing Library |
| 集成 | GameMain 集成 RhythmController 完整回合流程 | Vitest + 模拟 store |
| 视觉 | 爆发点三层特效叠加、弹幕并发、大字幕样式 | 手动截图 |
| E2E | 新游戏→创建→一局完整→GameOver | Playwright |

---

## 八、实现阶段

| 阶段 | 内容 | 文件量 |
|------|------|--------|
| Phase 1：系统人格内核 | SystemVoice + MemePackager + 重写 SystemDialogue | 3 新，2 改 |
| Phase 2：爽点节奏 | RhythmController + GameMain 集成 | 1 新，1 改 |
| Phase 3：视觉反馈 | BarrageToast + Onomatopoeia 扩展 + MangaPanel shake | 1 新，3 改 |
| Phase 4：打磨 | 梗库完善、语气调优、移动端适配、性能优化 | 配置表 + CSS |
