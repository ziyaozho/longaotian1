# 设计文档：UI 更新

> 对应 ending.md.txt 各章节的 UI 展示需求

## 背景

当前 GameMain 界面主要展示属性面板、装备栏、日志等基础信息。新增的核心状态（故事记忆、NPC关系、世界状态、结局线索）需要相应的 UI 展示。

## 目标

1. GameMain 新增折叠面板：当前地点/时间、已知NPC、故事摘要、近期事件、隐藏结局线索
2. GameOver 升级：结局回顾文、决策时间线、NPC最终关系、结局评分
3. 保持漫画风格 UI 一致性

---

## GameMain 新增面板

### 面板位置

在 GameMain 左栏的属性面板区域，新增一个可折叠的信息面板组。放在"属性面板"下方或"装备栏"旁边。

### 当前地点与时间

```typescript
// 紧凑展示，一行
<div className="flex items-center justify-between text-xs">
  <span className="text-game-text-muted">📍 {player.worldState.currentLocation}</span>
  <span className="text-game-text-muted">⏰ {player.worldState.timeline}</span>
</div>
```

### 已知NPC 列表（可折叠）

```typescript
{player.npcs.length > 0 && (
  <MangaPanel className="!p-3 mt-2">
    <button
      className="flex items-center justify-between w-full"
      onClick={() => setShowNPCs(!showNPCs)}
    >
      <h3 className="font-bold manga-title text-sm">已知人物 ({player.npcs.length})</h3>
      <span className="text-xs">{showNPCs ? '▲' : '▼'}</span>
    </button>

    {showNPCs && (
      <div className="space-y-2 mt-2">
        {player.npcs
          .filter((n) => n.isAlive)
          .map((npc) => (
            <div key={npc.npcId} className="ink-border p-2 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{npc.name}</span>
                <RelationshipBadge value={npc.relationship} />
              </div>
              <p className="text-[10px] text-game-text-muted">{npc.role}</p>
              <p className="text-[10px] text-game-text-muted mt-0.5">
                {npc.currentStatus}
              </p>
              {npc.memoryOfPlayer.length > 0 && (
                <p className="text-[10px] text-gray-500 mt-0.5 italic">
                  "{npc.memoryOfPlayer[npc.memoryOfPlayer.length - 1]}"
                </p>
              )}
            </div>
          ))}
      </div>
    )}
  </MangaPanel>
)}
```

**RelationshipBadge 组件：**

```typescript
function RelationshipBadge({ value }: { value: number }) {
  const getColor = () => {
    if (value >= 80) return '#e74c3c'; // 红色（羁绊）
    if (value >= 50) return '#f39c12'; // 橙色（亲近）
    if (value >= 10) return '#27ae60'; // 绿色（友善）
    if (value >= -10) return '#7f8c8d'; // 灰色（中立）
    if (value >= -50) return '#2980b9'; // 蓝色（冷淡）
    return '#8e44ad'; // 紫色（敌对）
  };

  const getLabel = () => {
    if (value >= 80) return '羁绊';
    if (value >= 50) return '亲近';
    if (value >= 10) return '友善';
    if (value >= -10) return '中立';
    if (value >= -50) return '冷淡';
    return '敌对';
  };

  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded text-white"
      style={{ backgroundColor: getColor() }}
    >
      {getLabel()} {value}
    </span>
  );
}
```

### 故事摘要（可折叠）

```typescript
{player.storyMemory.longTermSummary && (
  <MangaPanel className="!p-3 mt-2">
    <button
      className="flex items-center justify-between w-full"
      onClick={() => setShowSummary(!showSummary)}
    >
      <h3 className="font-bold manga-title text-sm">故事摘要</h3>
      <span className="text-xs">{showSummary ? '▲' : '▼'}</span>
    </button>
    {showSummary && (
      <p className="text-xs text-game-text mt-2 leading-relaxed">
        {player.storyMemory.longTermSummary}
      </p>
    )}
  </MangaPanel>
)}
```

### 近期事件

```typescript
{player.storyMemory.recentEvents.length > 0 && (
  <div className="mt-2 space-y-1">
    {player.storyMemory.recentEvents.slice(-3).map((e) => (
      <div key={e.round} className="text-[10px] text-gray-600 flex items-center gap-1">
        <span className="text-gray-400">第{e.round}回合</span>
        <span>{e.event}</span>
      </div>
    ))}
  </div>
)}
```

### 隐藏结局线索（模糊提示）

不直接显示结局名称，而是用模糊的"命运预感"提示玩家：

```typescript
{player.endingProgress.targetEndingId && (
  <MangaPanel className="!p-3 mt-2" style={{ borderColor: '#8e44ad' }}>
    <h3 className="font-bold text-sm" style={{ color: '#8e44ad' }}>命运预感</h3>
    <p className="text-xs text-gray-600 mt-1 italic">
      {getEndingHint(player.endingProgress.targetEndingId, player.progress.round)}
    </p>
  </MangaPanel>
)}
```

**模糊提示词库：**

```typescript
const ENDING_HINTS: Record<string, string[]> = {
  ending_modern_king: [
    '你隐约感到，权力的巅峰正在远方召唤...',
    '财富与声望如潮水般涌来，但你心中有一个更大的野心...',
  ],
  ending_immortal_hermit: [
    '你感到内心深处渴望远离纷争，寻找一片宁静之地...',
    '某个人的身影总是在你修炼时浮现在脑海...',
  ],
  // ... 其他结局
};

function getEndingHint(endingId: string, round: number): string {
  const hints = ENDING_HINTS[endingId] || ['命运的齿轮正在转动...'];
  // 随回合推进显示不同的提示
  const index = Math.min(Math.floor(round / 10), hints.length - 1);
  return hints[index];
}
```

---

## GameOver 升级

### 布局调整

将 GameOver 分为几个区域：

1. **结局标题与评分**（顶部，大字）
2. **结局回顾文**（中间，AI 生成或本地模板）
3. **决策时间线**（下方，按回合排列）
4. **NPC 最终关系**（底部，关系值总结）
5. **成就与统计**（最底部）

### 结局回顾文

```typescript
// 优先使用 AI 生成的回顾
// 如果 AI 失败或不可用，使用本地模板

function generateLocalEndingReview(player: Player, ending: EndingDefinition): string {
  const decisions = player.storyMemory.decisionLog;
  const name = player.name;

  if (decisions.length === 0) {
    return `${name}的旅程平淡无奇，没有留下太多值得铭记的故事。`;
  }

  // 提取前3个和后2个决策作为时间线锚点
  const keyDecisions = [
    ...decisions.slice(0, 2),
    ...decisions.slice(-2),
  ];

  return `${name}的一生充满了抉择。` +
    keyDecisions.map((d) => `第${d.round}回合，${d.choice}，${d.result}。`).join('') +
    `最终，${ending.description}`;
}
```

### 决策时间线

```typescript
<div className="space-y-2">
  {player.storyMemory.decisionLog.map((d, i) => (
    <div key={i} className="flex items-start gap-2">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-game-accent" />
        {i < player.storyMemory.decisionLog.length - 1 && (
          <div className="w-0.5 h-full bg-gray-300" />
        )}
      </div>
      <div className="pb-4">
        <span className="text-[10px] text-gray-400">第{d.round}回合</span>
        <p className="text-xs font-medium">{d.choice}</p>
        <p className="text-[10px] text-gray-500">{d.result}</p>
      </div>
    </div>
  ))}
</div>
```

### NPC 最终关系

```typescript
{player.npcs.length > 0 && (
  <div className="grid grid-cols-2 gap-2 mt-4">
    {player.npcs.map((npc) => (
      <div key={npc.npcId} className="ink-border p-2 bg-white">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold">{npc.name}</span>
          {npc.isAlive ? (
            <RelationshipBadge value={npc.relationship} />
          ) : (
            <span className="text-[10px] text-gray-400">已离世</span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5">{npc.role}</p>
      </div>
    ))}
  </div>
)}
```

---

## 漫画风格一致性

所有新增面板遵循现有漫画风格：
- 使用 `MangaPanel` 组件作为容器
- 边框使用 `ink-border` 类
- 标题使用 `manga-title` 类
- 颜色使用项目定义的语义颜色变量

---

## 实现文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/screens/GameMain.tsx` | 修改 | 新增世界状态/NPC/故事摘要/结局线索面板 |
| `src/components/screens/GameOver.tsx` | 修改 | 结局回顾、决策时间线、NPC关系、评分展示 |
| `src/components/RelationshipBadge.tsx` | 创建 | 关系值徽章组件（可选，也可内联） |
