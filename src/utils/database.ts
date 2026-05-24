// ============================================================
// IndexedDB 数据库层 —— 替代 localStorage
// 支持多存档槽位、异步读写、更大存储容量
// ============================================================

import type { Player } from '../types';

const DB_NAME = 'longaotian_game';
const DB_VERSION = 1;

/** 存档记录 */
export interface SaveSlot {
  id: string;
  playerName: string;
  sceneName: string;
  round: number;
  level: number;
  createdAt: number;
  updatedAt: number;
  data: Player;
}

let dbInstance: IDBDatabase | null = null;

/** 打开/初始化数据库 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      // 存档表
      if (!db.objectStoreNames.contains('saves')) {
        const store = db.createObjectStore('saves', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('playerName', 'playerName', { unique: false });
      }
      // 全局数据表（成就、场景记录等）
      if (!db.objectStoreNames.contains('global')) {
        db.createObjectStore('global', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// 存档 CRUD
// ============================================================

/** 获取所有存档槽位（不含完整data，用于列表展示） */
export async function getSaveSlots(): Promise<Omit<SaveSlot, 'data'>[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('saves', 'readonly');
    const store = tx.objectStore('saves');
    const request = store.getAll();

    request.onsuccess = () => {
      const slots = (request.result as SaveSlot[])
        .map(({ id, playerName, sceneName, round, level, createdAt, updatedAt }) => ({
          id, playerName, sceneName, round, level, createdAt, updatedAt,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(slots);
    };
    request.onerror = () => resolve([]);
  });
}

/** 根据ID加载完整存档 */
export async function loadSave(saveId: string): Promise<SaveSlot | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('saves', 'readonly');
    const store = tx.objectStore('saves');
    const request = store.get(saveId);
    request.onsuccess = () => {
      const slot = request.result as SaveSlot | null;
      if (slot?.data?.inventory) {
        const seen = new Set<string>();
        slot.data.inventory = slot.data.inventory.filter(i => {
          if (seen.has(i.id)) return false;
          seen.add(i.id);
          return true;
        });
      }
      resolve(slot || null);
    };
    request.onerror = () => resolve(null);
  });
}

/** 保存存档（新建或更新） */
export async function saveGame(player: Player): Promise<void> {
  const db = await openDB();
  const scene = player.progress.sceneType;

  return new Promise((resolve) => {
    const tx = db.transaction('saves', 'readwrite');
    const store = tx.objectStore('saves');

    const slot: SaveSlot = {
      id: player.id,
      playerName: player.name,
      sceneName: typeof scene === 'string' ? scene : '未知',
      round: player.progress.round,
      level: player.stats.level,
      createdAt: player.createdAt || Date.now(),
      updatedAt: Date.now(),
      data: player,
    };

    store.put(slot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => { console.error('Save failed:', tx.error); resolve(); };
  });
}

/** 删除存档 */
export async function deleteSave(saveId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('saves', 'readwrite');
    const store = tx.objectStore('saves');
    store.delete(saveId);
    tx.oncomplete = () => resolve();
  });
}

/** 获取存档数量 */
export async function getSaveCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('saves', 'readonly');
    const store = tx.objectStore('saves');
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });
}

// ============================================================
// 全局数据（替代 localStorage 的成就/场景记录）
// ============================================================

export async function getGlobalData(key: string): Promise<unknown | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('global', 'readonly');
    const store = tx.objectStore('global');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => resolve(null);
  });
}

export async function setGlobalData(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('global', 'readwrite');
    const store = tx.objectStore('global');
    store.put({ key, value });
    tx.oncomplete = () => resolve();
  });
}

// ============================================================
// 迁移：将旧 localStorage 存档迁移到 IndexedDB
// ============================================================

export async function migrateFromLocalStorage(): Promise<number> {
  try {
    const raw = localStorage.getItem('rebirth_simulator_saves');
    if (!raw) return 0;

    const parsed = JSON.parse(raw);
    const saves: Player[] = parsed.saves || [];
    if (saves.length === 0) return 0;

    for (const player of saves) {
      await saveGame(player);
    }

    // 迁移完成后清除旧数据
    localStorage.removeItem('rebirth_simulator_saves');
    return saves.length;
  } catch {
    return 0;
  }
}
