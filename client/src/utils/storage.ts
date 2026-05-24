import type { Player } from '../types';

const SAVE_KEY = 'rebirth_simulator_saves';
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
      return JSON.parse(data);
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
    return data.saves.find((s) => s.id === saveId) || null;
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
    return JSON.parse(envelope.d);
  } catch (e) {
    console.error('Failed to import save:', e);
    return null;
  }
};
