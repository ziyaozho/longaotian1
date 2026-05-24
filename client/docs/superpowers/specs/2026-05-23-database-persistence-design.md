# 数据库持久化方案设计

**日期：** 2026-05-23
**状态：** 已确认
**范围：** 将游戏数据从 localStorage 迁移到 IndexedDB (Dexie.js)

---

## 目标

将系统记录、玩家存档、成就等游戏数据从 localStorage 迁移到基于 Dexie.js 封装的 IndexedDB，获得更大的存储容量和结构化查询能力。

## 架构

```
React UI → Zustand Store (内存缓存) → Dexie.js → IndexedDB
```

**核心原则：** Zustand 是缓存，Dexie 是真相源。写入同时写两者，读取从 Zustand，启动时 Dexie → Zustand。IndexedDB 不可用时静默降级到 localStorage。

## 技术选型

- **Dexie.js** (~20KB gzipped) 封装 IndexedDB
- React 19 + TypeScript + Vite

## 数据库 Schema

### players 表

| 字段 | 类型 | 索引 | 说明 |
|------|------|------|------|
| `id` | string | primary | 存档ID (`save_timestamp`) |
| `name` | string | index | 玩家名 |
| `sceneType` | string | index | 当前世界 |
| `level` | number | index | 等级 |
| `data` | Player (JSON) | — | 完整 Player 对象 |
| `updatedAt` | number | index | 最后保存时间戳 |

```javascript
db.version(1).stores({
  players: '&id, name, sceneType, level, updatedAt',
});
```

### logs 表

| 字段 | 类型 | 索引 | 说明 |
|------|------|------|------|
| `id` | auto | — | 自增主键 |
| `playerId` | string | index | 所属存档 |
| `type` | string | composite | info/reward/upgrade/warning/error |
| `text` | string | — | 日志内容 |
| `timestamp` | number | index | 时间戳 |
| `metadata` | object | — | 可选额外数据 |

```javascript
db.version(1).stores({
  logs: '++id, playerId, type, [playerId+type], timestamp',
});
```

### meta 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | string | primary (`achievements`, `visitedScenes`, `lastSaveId`, `migrated`) |
| `value` | any | JSON 值 |

```javascript
db.version(1).stores({
  meta: '&key',
});
```

## 查询能力

```typescript
// 按类型筛选系统记录
db.logs.where({ playerId: 'xxx', type: 'upgrade' }).reverse().limit(50).toArray();

// 最近100条记录
db.logs.where('playerId').equals('xxx').reverse().limit(100).toArray();

// 时间范围搜索
db.logs.where('timestamp').between(startTs, endTs).toArray();

// 按等级查存档
db.players.where('level').above(10).toArray();
```

## 数据流

### 启动加载

1. Dexie 初始化 (`db.open()`)
2. 检查 meta 表 `migrated` 标记
3. 未迁移 → localStorage → Dexie 迁移 → 写标记
4. 从 meta 表加载 achievements/visitedScenes
5. 渲染 UI，选择存档时从 players 表加载

### 运行时写入

- **系统日志：** 先写内存 (gameStore state)，再写 `db.logs.put()`
- **存档：** 先写内存 (Zustand set)，再写 `db.players.put()`
- **全局数据：** 写 `db.meta.put()`
- DB 写入失败只 console.warn，不阻塞 UI

### 迁移策略

- 启动时一次性从 localStorage 迁移所有数据到 Dexie
- 原 localStorage 数据保留不删除
- 迁移完成后设 `meta.key='migrated', value=true`

## 容错

- `db.open()` 失败 → `fallbackMode: true` → 回退到 localStorage
- 单次 DB 写入失败 → 仅 console.warn → 数据保留在内存中
- 隐私模式 IndexedDB 不可用 → 自动降级，UI 无变化

## 文件变更

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `src/db/database.ts` | Dexie 实例 + Schema + 查询辅助函数 |
| 新增 | `src/db/migrate.ts` | localStorage → IndexedDB 迁移逻辑 |
| 修改 | `src/utils/storage.ts` | 替换 localStorage 调用为 Dexie API |
| 修改 | `src/store/playerStore.ts` | 启动时从 Dexie 加载数据 |
| 修改 | `src/store/gameStore.ts` | addSystemLog 同步写 Dexie |

## 依赖

- `dexie` (新增)

---

## 自检

1. **占位符扫描：** 无 TODO/待定。
2. **内部一致性：** Schema 定义与数据流描述一致。
3. **范围：** 聚焦单数据库迁移，可用一个实现计划覆盖。
4. **模糊性：** 无——所有字段类型和索引策略已明确。
