# 天赋特质系统 + 协同系统 设计规格

## 概述

在游戏中新增天赋特质系统。玩家到达 5 级时触发首次三选一天赋，后续可通过剧情选择获得更多天赋（最多 3 个）。天赋之间基于标签匹配形成协同效果，影响属性和战斗。

---

## 一、数据模型

### Talent

```typescript
interface Talent {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'magic' | 'body' | 'mind' | 'social' | 'craft' | 'luck';
  worldTheme: SceneType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  effects: TalentEffect;
  synergyTags: string[];
}

interface TalentEffect {
  attrBonus?: Partial<Attributes>;
  statBonus?: Partial<Stats>;
  skillUnlock?: string;
  damageType?: string;
  conditionalBonus?: { condition: string; bonus: TalentEffect };
}
```

### Player 扩展

Player 新增字段：`talents: Talent[]`（最多 3 个）。

### 天赋池

- 8 个世界观 × ~14 个天赋 = ~110 个天赋
- 存储于 `src/data/talents.ts`
- 每个天赋有 2-4 个 `synergyTags`

---

## 二、获取流程

### 首次获取（5 级触发）

```
回合结算 → 检测 player.stats.level >= 5 且 player.talents.length === 0
  → 弹出三选一界面
  → 按规则筛选 3 个候选天赋
  → 玩家选择 → 效果生效 → 继续游戏
```

### 三选一筛选规则

1. 天赋池按 `worldTheme` 过滤，匹配当前世界观的占 2 个槽位
2. 第三个槽位从全池随机（可跨世界观）
3. 稀有度加权：属性越高，高稀有度出现概率越大
4. 排除已有天赋的 id

### 后续获取

Choice 类型新增 `rewardTalent?: string`，剧情选项中指定天赋 ID。已有 3 个天赋时该选项不可选或显示"替换"提示。

---

## 三、协同系统

### 触发

被动检查，每次新天赋加入时扫描全部已有天赋。

### 协同强度

两个天赋的 `synergyTags` 交集非空 → 形成协同：

| 共同标签数 | 强度 | 效果 |
|-----------|------|------|
| 1 | 弱协同 | 效果 +20% |
| 2 | 强协同 | 效果 +50%，显示组合技名 |
| 3+ | 传说协同 | 效果翻倍，追加彩色特效 |

### 三位一体

三个天赋两两之间都有协同 → 全局属性额外 +15%。

### UI 表现

属性面板中，有协同的天赋之间显示连线 + 组合技名称，颜色对应协同强度。

---

## 四、与后续系统的接口

- Boss 关卡：Boss 可检测玩家天赋协同，触发特定对话或机制
- 分支事件链：事件选项可检查玩家天赋 ID 作为前置条件
- Meta 成长：可在局外解锁新天赋加入总池

---

## 五、实现范围

### 新文件
- `src/data/talents.ts` — 110 个天赋数据
- `src/components/screens/TalentSelect.tsx` — 三选一界面
- `src/utils/talentSync.ts` — 协同计算引擎

### 修改文件
- `src/types/game.ts` — 新增 Talent、TalentEffect 类型，Player 加 talents 字段
- `src/store/playerStore.ts` — 新增 addTalent、hasTalent 方法
- `src/agents/orchestrator.ts` — TurnResult 增加 talentChoice 字段
- `src/components/screens/GameMain.tsx` — 集成 TalentSelect 弹窗，属性面板展示天赋和协同连线
- `src/types/agent.ts` — Choice 增加 rewardTalent 字段
