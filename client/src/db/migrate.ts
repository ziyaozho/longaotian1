import { getDB, dbSetMeta, dbGetMeta, isFallbackMode } from './database';

const SAVE_KEY = 'rebirth_simulator_saves';
const ACHIEVEMENT_KEY = 'rebirth_simulator_achievements';
const VISITED_SCENES_KEY = 'rebirth_simulator_visited_scenes';

export async function migrateFromLocalStorage(): Promise<boolean> {
  if (isFallbackMode()) return false;

  try {
    const alreadyMigrated = await dbGetMeta<boolean>('migrated');
    if (alreadyMigrated) return true;
  } catch {
    // DB not ready yet
    return false;
  }

  try {
    const db = getDB();

    // Migrate saves → players table
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const saves = data.saves || [];
        for (const player of saves) {
          await db.players.put({
            id: player.id,
            name: player.name,
            sceneType: player.progress?.sceneType || '',
            level: player.stats?.level || 1,
            data: player,
            updatedAt: player.createdAt || Date.now(),
          });
        }
      }
    } catch (e) {
      console.warn('迁移玩家数据失败', e);
    }

    // Migrate achievements → meta table
    try {
      const raw = localStorage.getItem(ACHIEVEMENT_KEY);
      if (raw) {
        const achievements = JSON.parse(raw);
        await db.meta.put({ key: 'achievements', value: achievements });
      }
    } catch (e) {
      console.warn('迁移成就数据失败', e);
    }

    // Migrate visitedScenes → meta table
    try {
      const raw = localStorage.getItem(VISITED_SCENES_KEY);
      if (raw) {
        const visitedScenes = JSON.parse(raw);
        await db.meta.put({ key: 'visitedScenes', value: visitedScenes });
      }
    } catch (e) {
      console.warn('迁移场景数据失败', e);
    }

    // Migrate lastSaveId → meta table
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.lastSaveId) {
          await db.meta.put({ key: 'lastSaveId', value: data.lastSaveId });
        }
      }
    } catch (e) {
      console.warn('迁移 lastSaveId 失败', e);
    }

    await dbSetMeta('migrated', true);
    return true;
  } catch (e) {
    console.warn('数据迁移失败', e);
    return false;
  }
}
