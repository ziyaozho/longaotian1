import type { Player } from '../types';

const SAVE_KEY = 'rebirth_simulator_saves';

/** 向后兼容：为旧存档填充 ending.md.txt 新增字段的默认值 + 背包去重 */
export function migratePlayerData(player: Partial<Player>): Player {
  const inventory = player.inventory ?? [];
  const seen = new Set<string>();
  const nonItemNames = /^普通人$|^系统商城$|^系统$|^NPC$/;
  const deduped = inventory.filter(i => {
    if (!i || !i.id || nonItemNames.test(i.name)) return false;
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
  if (deduped.length !== inventory.length) {
    console.warn(`[迁移] 背包去重: 移除 ${inventory.length - deduped.length} 个重复物品`);
  }

  return {
    ...player,
    inventory: deduped,
    npcs: player.npcs ?? [],
    relationships: player.relationships ?? {},
    storyMemory: player.storyMemory ?? {
      longTermSummary: '',
      recentEvents: [],
      decisionLog: [],
    },
    worldState: player.worldState ?? {
      currentLocation: '新手村',
      timeline: '第一天·清晨',
      globalFlags: {},
    },
    extendedSystem: player.extendedSystem ?? {
      dialogueStyle: '毒舌',
    },
    endingProgress: player.endingProgress ?? {
      targetEndingId: '',
      conditionStatus: {},
      isFailed: false,
    },
  } as Player;
}
const ACHIEVEMENT_KEY = 'rebirth_simulator_achievements';
const VISITED_SCENES_KEY = 'rebirth_simulator_visited_scenes';

export interface SaveData {
  saves: Player[];
  lastSaveId: string | null;
}

export const getSaves = (): SaveData => {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as SaveData;
      // 向后兼容：迁移每个存档
      parsed.saves = parsed.saves.map((s) => migratePlayerData(s));
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load saves:', e);
  }
  return { saves: [], lastSaveId: null };
};

export const savePlayer = (player: Player): void => {
  try {
    const data = getSaves();
    const existingIndex = data.saves.findIndex((s) => s.id === player.id);
    if (existingIndex >= 0) {
      data.saves[existingIndex] = player;
    } else {
      data.saves.push(player);
      if (data.saves.length > 10) {
        data.saves.shift();
      }
    }
    data.lastSaveId = player.id;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save player:', e);
  }
};

export const loadPlayer = (saveId: string): Player | null => {
  try {
    const data = getSaves();
    const found = data.saves.find((s) => s.id === saveId);
    return found ? migratePlayerData(found) : null;
  } catch (e) {
    console.error('Failed to load player:', e);
    return null;
  }
};

export const deleteSave = (saveId: string): void => {
  try {
    const data = getSaves();
    data.saves = data.saves.filter((s) => s.id !== saveId);
    if (data.lastSaveId === saveId) {
      data.lastSaveId = data.saves.length > 0 ? data.saves[data.saves.length - 1].id : null;
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to delete save:', e);
  }
};

export const getGlobalAchievements = (): string[] => {
  try {
    const data = localStorage.getItem(ACHIEVEMENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveGlobalAchievements = (achievements: string[]): void => {
  try {
    localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(achievements));
  } catch (e) {
    console.error('Failed to save achievements:', e);
  }
};

export const getVisitedScenes = (): string[] => {
  try {
    const data = localStorage.getItem(VISITED_SCENES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveVisitedScenes = (scenes: string[]): void => {
  try {
    localStorage.setItem(VISITED_SCENES_KEY, JSON.stringify(scenes));
  } catch (e) {
    console.error('Failed to save visited scenes:', e);
  }
};

const SAVE_VERSION = 'RS1';

function computeChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export const exportSave = (player: Player): string => {
  const payload = JSON.stringify(player);
  const checksum = computeChecksum(payload);
  const envelope = JSON.stringify({ v: SAVE_VERSION, c: checksum, d: payload });
  return btoa(envelope);
};

export const importSave = (data: string): Player | null => {
  try {
    const envelope = JSON.parse(atob(data));
    if (envelope.v !== SAVE_VERSION) {
      console.error('Save version mismatch:', envelope.v);
      return null;
    }
    const checksum = computeChecksum(envelope.d);
    if (checksum !== envelope.c) {
      console.error('Save checksum invalid');
      return null;
    }
    const player = JSON.parse(envelope.d) as Partial<Player>;
    return migratePlayerData(player);
  } catch (e) {
    console.error('Failed to import save:', e);
    return null;
  }
};
