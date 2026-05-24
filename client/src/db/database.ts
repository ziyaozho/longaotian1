import Dexie, { type Table } from 'dexie';
import type { Player } from '../types';

export interface PlayerRecord {
  id: string;
  name: string;
  sceneType: string;
  level: number;
  data: Player;
  updatedAt: number;
}

export interface LogRecord {
  id?: number;
  playerId: string;
  type: 'info' | 'reward' | 'upgrade' | 'warning' | 'error';
  text: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export class GameDB extends Dexie {
  players!: Table<PlayerRecord, string>;
  logs!: Table<LogRecord, number>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('RebirthSimulator');
    this.version(1).stores({
      players: '&id, name, sceneType, level, updatedAt',
      logs: '++id, playerId, type, [playerId+type], timestamp',
      meta: '&key',
    });
  }
}

let dbInstance: GameDB | null = null;
let fallbackMode = false;

export function getDB(): GameDB {
  if (!dbInstance) {
    dbInstance = new GameDB();
  }
  return dbInstance;
}

export async function initDB(): Promise<boolean> {
  const db = getDB();
  try {
    await db.open();
    fallbackMode = false;
    return true;
  } catch (e) {
    console.warn('IndexedDB 不可用，降级到 localStorage', e);
    fallbackMode = true;
    return false;
  }
}

export function isFallbackMode(): boolean {
  return fallbackMode;
}

// ========== Players helpers ==========

export async function dbSavePlayer(player: Player): Promise<void> {
  if (fallbackMode) return;
  try {
    await getDB().players.put({
      id: player.id,
      name: player.name,
      sceneType: player.progress.sceneType,
      level: player.stats.level,
      data: player,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn('保存玩家失败', e);
  }
}

export async function dbLoadPlayer(saveId: string): Promise<Player | null> {
  if (fallbackMode) return null;
  try {
    const record = await getDB().players.get(saveId);
    return record?.data ?? null;
  } catch (e) {
    console.warn('加载玩家失败', e);
    return null;
  }
}

export async function dbGetAllPlayers(): Promise<PlayerRecord[]> {
  if (fallbackMode) return [];
  try {
    return await getDB().players.orderBy('updatedAt').reverse().toArray();
  } catch (e) {
    console.warn('获取玩家列表失败', e);
    return [];
  }
}

export async function dbDeletePlayer(saveId: string): Promise<void> {
  if (fallbackMode) return;
  try {
    await getDB().players.delete(saveId);
    await getDB().logs.where('playerId').equals(saveId).delete();
  } catch (e) {
    console.warn('删除玩家失败', e);
  }
}

// ========== Logs helpers ==========

export async function dbAddLog(record: LogRecord): Promise<void> {
  if (fallbackMode) return;
  try {
    await getDB().logs.put({
      ...record,
      timestamp: record.timestamp || Date.now(),
    });
  } catch (e) {
    console.warn('保存日志失败', e);
  }
}

export async function dbGetLogs(playerId: string, type?: LogRecord['type'], limit = 50): Promise<LogRecord[]> {
  if (fallbackMode) return [];
  try {
    let query = getDB().logs.where('playerId').equals(playerId);
    if (type) {
      query = getDB().logs.where({ playerId, type });
    }
    return await query.reverse().limit(limit).toArray();
  } catch (e) {
    console.warn('获取日志失败', e);
    return [];
  }
}

// ========== Meta helpers ==========

export async function dbGetMeta<T = unknown>(key: string): Promise<T | null> {
  if (fallbackMode) return null;
  try {
    const record = await getDB().meta.get(key);
    return (record?.value as T) ?? null;
  } catch (e) {
    console.warn('读取元数据失败', e);
    return null;
  }
}

export async function dbSetMeta(key: string, value: unknown): Promise<void> {
  if (fallbackMode) return;
  try {
    await getDB().meta.put({ key, value });
  } catch (e) {
    console.warn('写入元数据失败', e);
  }
}
