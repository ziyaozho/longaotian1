# 设计文档：NPC 记忆与关系系统

> 对应 ending.md.txt §6 —— NPC 系统设计

## 背景

ending.md.txt 要求 NPC "有血有肉"：不能只是生成几句对话就消失的工具人，需要持久记忆和动态关系。当前项目的 `orchestrator.ts` 中有 `NPC_TEMPLATES`，但邂逅是纯静态的——每次遇到都是"初次见面"，没有记忆累积。

## 目标

1. NPC 邂逅时创建持久状态，跨回合保留记忆和关系
2. 与同一 NPC 多次互动时，对话基于已有记忆生成
3. NPC 关系值随互动动态变化（-100~100）
4. NPC 可在玩家未直接交互时"自主行动"
5. 防止 NPC 幻觉：已死亡 NPC 不再出现，对话不违背已有记忆

---

## 数据结构

使用已在 `01-core-state.md` 中定义的 `NPCState`：

```typescript
export interface NPCState {
  npcId: string;
  name: string;
  role: string;
  personality: string;
  relationship: number;
  memoryOfPlayer: string[];    // 最近 5 条关键记忆
  currentGoal: string;
  currentStatus: string;
  dialogueStyle: string;
  isAlive: boolean;
  firstMetRound: number;
}
```

---

## NPC 邂逅模板升级

当前 `orchestrator.ts` 中的 `NPC_TEMPLATES` 需要扩展，加入更多元数据：

```typescript
interface NPCTemplate {
  npcId: string;
  name: string;
  role: string;
  personality: string;
  dialogueStyle: string;
  initialGoal: string;
  description: string;         // 首次邂逅描述
  reencounterDescriptions: string[]; // 再次邂逅时的描述模板
  choices: Array<{
    id: string;
    text: string;
    consequence: string;
    relationshipDelta: number;  // 选择对关系值的影响
  }>;
}
```

**示例模板（苏晴）：**

```typescript
{
  npcId: 'su_qing',
  name: '苏晴',
  role: '同班同学/潜在女主',
  personality: '外冷内热，好奇心重，智商高',
  dialogueStyle: '略带审视，偶尔流露关心',
  initialGoal: '弄清楚林风突然变强的秘密',
  description: '图书馆的角落里，苏晴合上书本，目光落在你身上。她推了推眼镜，语气平淡却带着一丝探究："最近你变了。不是外表，是...气息。"',
  reencounterDescriptions: [
    '苏晴在走廊遇见你，这次她的眼神少了几分警惕，多了一些复杂的情绪。',
    '你再次见到苏晴，她似乎已经对你的秘密有了自己的猜测。',
  ],
  choices: [
    { id: 'honest', text: '坦诚相告', consequence: '关系值+20，可能获得帮助', relationshipDelta: 20 },
    { id: 'evade', text: '含糊其辞', consequence: '关系值-5，苏晴更加怀疑', relationshipDelta: -5 },
    { id: 'reverse', text: '反问她的目的', consequence: '关系值不变，情报交换', relationshipDelta: 0 },
  ],
}
```

---

## 邂逅逻辑升级

文件：`src/agents/orchestrator.ts`

### 邂逅判定

```typescript
// 每回合有概率触发NPC邂逅
const ENCOUNTER_CHANCE = 0.3; // 30%概率

export function shouldTriggerEncounter(player: Player): boolean {
  // 基础概率
  if (!checkProbability(ENCOUNTER_CHANCE)) return false;

  // 某些天赋/状态可能提升/降低邂逅概率
  if (player.talents.some((t) => t.id === 'spirit_eye')) {
    return checkProbability(0.5); // 灵视天赋增加邂逅概率
  }

  return true;
}
```

### 邂逅处理

```typescript
export function processEncounter(
  player: Player,
  template: NPCTemplate
): { isNew: boolean; npc: NPCState; description: string } {
  const existingNPC = player.npcs.find((n) => n.npcId === template.npcId);

  if (existingNPC) {
    // 已有NPC —— 基于记忆生成再遇描述
    const memoryContext = existingNPC.memoryOfPlayer.slice(-2).join('；');
    const desc = template.reencounterDescriptions[
      Math.min(existingNPC.memoryOfPlayer.length, template.reencounterDescriptions.length - 1)
    ] || template.reencounterDescriptions[0];

    return {
      isNew: false,
      npc: existingNPC,
      description: `${desc}\n\n（苏晴对你的记忆：${memoryContext}）`,
    };
  } else {
    // 新NPC —— 创建状态
    const newNPC: NPCState = {
      npcId: template.npcId,
      name: template.name,
      role: template.role,
      personality: template.personality,
      relationship: 0,
      memoryOfPlayer: [],
      currentGoal: template.initialGoal,
      currentStatus: '初次邂逅',
      dialogueStyle: template.dialogueStyle,
      isAlive: true,
      firstMetRound: player.progress.round,
    };

    return {
      isNew: true,
      npc: newNPC,
      description: template.description,
    };
  }
}
```

---

## 关系值更新

```typescript
export function updateRelationship(
  npc: NPCState,
  delta: number,
  reason: string
): NPCState {
  const newRelationship = Math.max(-100, Math.min(100, npc.relationship + delta));

  // 关系值变化时，添加一条记忆
  const newMemory = `${reason}（关系值 ${npc.relationship} → ${newRelationship}）`;

  return {
    ...npc,
    relationship: newRelationship,
    memoryOfPlayer: [...npc.memoryOfPlayer.slice(-4), newMemory],
  };
}
```

---

## NPC 自主行动

文件：`src/engine/npcAutonomy.ts`

### 行动触发

```typescript
const AUTONOMY_CHANCE = 0.2; // 每个存活NPC每回合20%概率自主行动

export function triggerNPCAutonomy(player: Player): Array<{
  npcId: string;
  name: string;
  action: string;
  worldHint: string; // 作为世界传闻展示给玩家
}> {
  const actions: Array<{ npcId: string; name: string; action: string; worldHint: string }> = [];

  for (const npc of player.npcs) {
    if (!npc.isAlive) continue;
    if (!checkProbability(AUTONOMY_CHANCE)) continue;

    // 根据NPC性格和当前目标生成行动
    const action = generateNPCAction(npc);

    // 更新NPC状态
    const updatedNPC: NPCState = {
      ...npc,
      currentStatus: action.newStatus,
      currentGoal: action.newGoal || npc.currentGoal,
      memoryOfPlayer: action.newMemory
        ? [...npc.memoryOfPlayer.slice(-4), action.newMemory]
        : npc.memoryOfPlayer,
    };

    // 通过 store 更新
    // playerStore.updateNPCStatus(npc.npcId, { currentStatus: action.newStatus, ... });

    actions.push({
      npcId: npc.npcId,
      name: npc.name,
      action: action.description,
      worldHint: action.worldHint,
    });
  }

  return actions;
}
```

### 行动生成（简化版，非AI）

```typescript
interface NPCAction {
  description: string;   // 行动描述
  newStatus: string;     // 更新后的状态
  newGoal?: string;      // 可能更新的目标
  newMemory?: string;    // 可能新增的记忆
  worldHint: string;     // 展示给玩家的世界传闻
}

function generateNPCAction(npc: NPCState): NPCAction {
  // 基于NPC性格和当前状态，从模板池中随机选择
  const actionTemplates = NPC_AUTONOMY_TEMPLATES[npc.npcId] || NPC_AUTONOMY_TEMPLATES['generic'];

  const template = randomChoice(actionTemplates);

  return {
    description: template.description,
    newStatus: template.newStatus,
    worldHint: template.worldHint.replace('{name}', npc.name),
  };
}

// 通用自主行动模板
const NPC_AUTONOMY_TEMPLATES: Record<string, Array<{
  description: string;
  newStatus: string;
  worldHint: string;
}>> = {
  generic: [
    { description: '在城中打探消息', newStatus: '在城中活动', worldHint: '你听说{name}最近在四处打探消息...' },
    { description: '独自修炼提升实力', newStatus: '闭关修炼中', worldHint: '有传闻说{name}的实力又有了突破...' },
    { description: '遭遇了小麻烦', newStatus: '处境有些困难', worldHint: '你隐约听说{name}最近遇到了一些麻烦...' },
  ],
  su_qing: [
    { description: '在图书馆查阅关于系统的古籍', newStatus: '在图书馆查阅资料', worldHint: '你注意到苏晴最近总泡在图书馆的古籍区...' },
    { description: '向其他学生打听你的消息', newStatus: '暗中调查你', worldHint: '有同学说苏晴最近一直在打听你的事情...' },
  ],
};
```

**自主行动展示方式：** 在 GameMain 的日志区域以"传闻"形式展示，如：
- "[传闻] 你听说苏晴最近在四处打探消息..."
- "[传闻] 有同学说苏晴最近一直在打听你的事情..."

这样既让玩家感到"世界在运转"，又不打断当前回合的主流程。

---

## AI Prompt 中的 NPC 注入

文件：`src/ai/contextManager.ts`

当当前回合涉及 NPC 时，将 NPC 完整状态注入 prompt：

```typescript
export function buildNPCContext(player: Player, npcId?: string): string {
  if (!npcId) {
    // 无特定NPC，注入所有已知NPC的摘要
    if (player.npcs.length === 0) return '[已知NPC] 无';

    return '[已知NPC摘要]\n' +
      player.npcs
        .filter((n) => n.isAlive)
        .map((n) => `- ${n.name}（${n.role}）：关系值${n.relationship}，当前${n.currentStatus}`)
        .join('\n');
  }

  // 特定NPC，注入完整状态
  const npc = player.npcs.find((n) => n.npcId === npcId);
  if (!npc) return '';

  return `[当前NPC状态]\n` +
    `NPC：${npc.name}\n` +
    `角色：${npc.role}\n` +
    `性格：${npc.personality}\n` +
    `与玩家关系：${npc.relationship}（${getRelationshipLabel(npc.relationship)}）\n` +
    `当前目标：${npc.currentGoal}\n` +
    `当前状态：${npc.currentStatus}\n` +
    `对话风格：${npc.dialogueStyle}\n` +
    `对玩家的记忆：\n${npc.memoryOfPlayer.map((m) => `  - ${m}`).join('\n') || '  无'}`;
}

function getRelationshipLabel(value: number): string {
  if (value >= 80) return '生死与共';
  if (value >= 50) return '亲近';
  if (value >= 10) return '友善';
  if (value >= -10) return '中立';
  if (value >= -50) return '冷淡';
  return '敌对';
}
```

---

## 防止 NPC 幻觉

文件：`src/engine/hallucinationGuard.ts`（见 05-hallucination-guard.md）

```typescript
export function validateNPCMentions(
  generatedText: string,
  player: Player
): string[] {
  const issues: string[] = [];

  for (const npc of player.npcs) {
    // 检查已死亡NPC是否被提及
    if (!npc.isAlive && generatedText.includes(npc.name)) {
      issues.push(`NPC "${npc.name}" 已死亡，不应在剧情中出现`);
    }
  }

  // 检查AI是否捏造了不存在的NPC
  // 方法：提取所有中文人名，检查是否在已知NPC列表中
  // 注意：允许AI引入"路人"角色，但不允许用常见NPC名字捏造新角色

  return issues;
}
```

---

## 集成流程

### 每回合邂逅流程

```
1. 判定是否触发邂逅（shouldTriggerEncounter）
2. 如果是：
   a. 从当前世界的NPC模板中随机选择
   b. 调用 processEncounter 处理（新/旧NPC）
   c. 将NPC状态注入AI prompt
   d. AI生成包含NPC的对话/剧情
   e. 玩家选择后，更新NPC关系值和记忆
   f. 将更新后的NPC写回 player.npcs
3. 处理NPC自主行动（triggerNPCAutonomy）
   a. 每个存活NPC有概率行动
   b. 更新NPC状态
   c. 将世界传闻加入日志
```

---

## 实现文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/agents/orchestrator.ts` | 修改 | 升级邂逅逻辑，支持有状态NPC |
| `src/engine/npcAutonomy.ts` | 创建 | NPC自主行动引擎 |
| `src/ai/contextManager.ts` | 修改 | 新增 NPC 状态注入段 |
| `src/store/playerStore.ts` | 修改 | 新增NPC操作方法（见 01-core-state.md） |
| `src/engine/hallucinationGuard.ts` | 创建 | NPC复活检测等（见 05-hallucination-guard.md） |
