import { create } from 'zustand';
import type { Player, Attributes, PlayerSystem, Stats, Progress, Item, Skill, Task, HistoryEvent, Talent, Artifact, SystemHistory } from '../types';
import { getSystemById } from '../data/systems';
import { useItemEffect } from '../data/items';
import { getLevelFromExp } from '../config/gameConfig';
import { createSystemHistory } from '../agents/systemAgent';

interface PlayerStore {
  player: Player | null;
  unlockedAchievements: string[];
  visitedScenes: string[];
  setPlayer: (player: Player | null) => void;
  updateAttributes: (attrs: Partial<Attributes>) => void;
  updateStats: (stats: Partial<Stats>) => void;
  updateSystem: (system: Partial<PlayerSystem>) => void;
  updateProgress: (progress: Partial<Progress>) => void;
  addItem: (item: Item) => void;
  removeItem: (itemId: string) => void;
  useItem: (itemId: string) => { success: boolean; message: string; effects: Record<string, number> };
  equipItem: (itemId: string) => { success: boolean; message: string };
  unequipItem: (slot: 'weapon' | 'armor' | 'accessory') => { success: boolean; message: string };
  addSkill: (skill: Skill) => void;
  addTask: (task: Task) => void;
  completeTask: (taskId: string) => void;
  addAchievement: (achievementId: string) => void;
  addHistory: (event: HistoryEvent) => void;
  createPlayer: (name: string, attributes: Attributes, sceneType: string, systemId: string) => Player;
  addTalent: (talent: Talent) => void;
  hasTalent: (talentId: string) => boolean;
  resetPlayer: () => void;
  addVisitedScene: (scene: string) => void;
  addGold: (amount: number) => void;
  removeGold: (amount: number) => boolean;
  addArtifact: (artifact: Artifact) => void;
  upgradeArtifact: (artifactId: string) => boolean;
  updateSystemHistory: (partial: Partial<SystemHistory>) => void;
  applyCheckInRewards: (result: import('../agents/types').CheckInResult) => void;
}

export const createInitialPlayer = (
  name: string,
  attributes: Attributes,
  sceneType: string,
  systemId: string,
  systemName: string
): Player => ({
  id: `save_${Date.now()}`,
  name,
  createdAt: Date.now(),
  attributes,
  stats: {
    level: 1,
    exp: 0,
    hp: 100 + attributes.physique * 10,
    maxHp: 100 + attributes.physique * 10,
    mp: 50 + attributes.intelligence * 5,
    maxMp: 50 + attributes.intelligence * 5,
    combatPower: attributes.physique * 5 + attributes.talent * 3,
    wealth: attributes.family * 200,
    fame: 0,
    gold: 0,
  },
  system: {
    id: systemId,
    name: systemName,
    level: 1,
    exp: 0,
    features: ['basic_feature'],
  },
  progress: {
    sceneType: sceneType as any,
    sceneLevel: 1,
    round: 1,
    age: Math.floor(Math.random() * 5) + 16,
    storyFlags: [],
  },
  inventory: [],
  equipment: {},
  skills: [],
  activeTasks: [],
  completedTasks: [],
  achievements: [],
  history: [],
  talents: [],
  npcStatuses: {},
  artifacts: [],
  systemHistory: createSystemHistory(),
});

export const usePlayerStore = create<PlayerStore>((set) => ({
  player: null,
  unlockedAchievements: [],
  visitedScenes: [],

  setPlayer: (player) => set({ player }),

  updateAttributes: (attrs) =>
    set((state) => ({
      player: state.player
        ? { ...state.player, attributes: { ...state.player.attributes, ...attrs } }
        : null,
    })),

  updateStats: (stats) =>
    set((state) => {
      if (!state.player) return { player: null };
      const newStats = { ...state.player.stats, ...stats };
      if (stats.exp !== undefined) {
        const newLevel = getLevelFromExp(newStats.exp);
        if (newLevel > newStats.level) {
          newStats.level = newLevel;
          newStats.maxHp += 20;
          newStats.maxMp += 10;
          newStats.combatPower += 15;
        }
      }
      return { player: { ...state.player, stats: newStats } };
    }),

  updateSystem: (system) =>
    set((state) => ({
      player: state.player
        ? { ...state.player, system: { ...state.player.system, ...system } }
        : null,
    })),

  updateProgress: (progress) =>
    set((state) => ({
      player: state.player
        ? { ...state.player, progress: { ...state.player.progress, ...progress } }
        : null,
    })),

  addItem: (item) =>
    set((state) => ({
      player: state.player
        ? { ...state.player, inventory: [...state.player.inventory, item] }
        : null,
    })),

  removeItem: (itemId) =>
    set((state) => ({
      player: state.player
        ? { ...state.player, inventory: state.player.inventory.filter((i) => i.id !== itemId) }
        : null,
    })),

  useItem: (itemId) => {
    let result = { success: false, message: '使用失败', effects: {} as Record<string, number> };
    set((state) => {
      if (!state.player) return state;
      const item = state.player.inventory.find((i) => i.id === itemId);
      if (!item) return state;

      const effects = useItemEffect(item);
      const newStats = { ...state.player.stats };
      const newAttributes = { ...state.player.attributes };
      let message = `使用了【${item.name}】`;

      // 应用效果
      for (const [key, value] of Object.entries(effects)) {
        if (key === 'hp') {
          newStats.hp = Math.min(newStats.maxHp, newStats.hp + value);
          message += `，生命恢复${value}点`;
        } else if (key === 'mp') {
          newStats.mp = Math.min(newStats.maxMp, newStats.mp + value);
          message += `，灵力恢复${value}点`;
        } else if (key === 'exp') {
          newStats.exp += value;
          message += `，获得${value}经验`;
        } else if (key === 'wealth') {
          newStats.wealth = Math.max(0, newStats.wealth + value);
          message += value > 0 ? `，获得${value}财富` : `，消耗${Math.abs(value)}财富`;
        } else if (key === 'combatPower') {
          newStats.combatPower += value;
          message += `，战斗力提升${value}`;
        } else if (['talent', 'appearance', 'intelligence', 'physique', 'family', 'luck'].includes(key)) {
          (newAttributes as any)[key] += value;
          message += `，${key}提升${value}`;
        }
      }

      // 检查升级
      const newLevel = getLevelFromExp(newStats.exp);
      if (newLevel > newStats.level) {
        newStats.level = newLevel;
        newStats.maxHp += 20;
        newStats.maxMp += 10;
        newStats.combatPower += 15;
        message += `，升级至${newLevel}级！`;
      }

      result = { success: true, message, effects };

      return {
        player: {
          ...state.player,
          stats: newStats,
          attributes: newAttributes,
          inventory: item.type === 'consumable'
            ? state.player.inventory.filter((i) => i.id !== itemId)
            : state.player.inventory,
        },
      };
    });
    return result;
  },

  equipItem: (itemId) => {
    let result = { success: false, message: '装备失败' };
    set((state) => {
      if (!state.player) return state;
      const item = state.player.inventory.find((i) => i.id === itemId);
      if (!item) return state;

      // Only weapon, armor, and skill_book can be equipped (skill_book goes to accessory slot)
      const equipType = item.type === 'skill_book' ? 'accessory' : item.type;
      if (equipType !== 'weapon' && equipType !== 'armor' && equipType !== 'accessory') {
        result = { success: false, message: '该物品无法装备' };
        return state;
      }

      const slot = equipType as 'weapon' | 'armor' | 'accessory';
      const currentEquipped = state.player.equipment[slot];

      // If something is already equipped, unequip it first (return to inventory)
      let newInventory = state.player.inventory;
      let newEquipment = { ...state.player.equipment };

      if (currentEquipped) {
        newInventory = [...newInventory, currentEquipped];
      }

      // Equip new item (remove from inventory)
      newInventory = newInventory.filter((i) => i.id !== itemId);
      newEquipment[slot] = item;

      // Apply equipment effects to stats
      const newStats = { ...state.player.stats };
      const newAttributes = { ...state.player.attributes };
      if (item.effect) {
        for (const [key, value] of Object.entries(item.effect)) {
          if (key === 'hp' || key === 'maxHp') {
            newStats.maxHp += value;
            newStats.hp += value;
          } else if (key === 'mp' || key === 'maxMp') {
            newStats.maxMp += value;
            newStats.mp += value;
          } else if (key === 'combatPower') {
            newStats.combatPower += value;
          } else if (['talent', 'appearance', 'intelligence', 'physique', 'family', 'luck'].includes(key)) {
            (newAttributes as any)[key] += value;
          } else if (key === 'exp') {
            newStats.exp += value;
          } else if (key === 'wealth') {
            newStats.wealth += value;
          }
        }
      }

      result = { success: true, message: `装备了【${item.name}】` };

      return {
        player: {
          ...state.player,
          stats: newStats,
          attributes: newAttributes,
          inventory: newInventory,
          equipment: newEquipment,
        },
      };
    });
    return result;
  },

  unequipItem: (slot) => {
    let result = { success: false, message: '卸下失败' };
    set((state) => {
      if (!state.player) return state;
      const item = state.player.equipment[slot];
      if (!item) {
        result = { success: false, message: '该部位没有装备' };
        return state;
      }

      // Remove equipment effects
      const newStats = { ...state.player.stats };
      const newAttributes = { ...state.player.attributes };
      if (item.effect) {
        for (const [key, value] of Object.entries(item.effect)) {
          if (key === 'hp' || key === 'maxHp') {
            newStats.maxHp = Math.max(1, newStats.maxHp - value);
            newStats.hp = Math.min(newStats.hp, newStats.maxHp);
          } else if (key === 'mp' || key === 'maxMp') {
            newStats.maxMp = Math.max(1, newStats.maxMp - value);
            newStats.mp = Math.min(newStats.mp, newStats.maxMp);
          } else if (key === 'combatPower') {
            newStats.combatPower = Math.max(0, newStats.combatPower - value);
          } else if (['talent', 'appearance', 'intelligence', 'physique', 'family', 'luck'].includes(key)) {
            (newAttributes as any)[key] = Math.max(1, (newAttributes as any)[key] - value);
          } else if (key === 'exp') {
            newStats.exp = Math.max(0, newStats.exp - value);
          } else if (key === 'wealth') {
            newStats.wealth = Math.max(0, newStats.wealth - value);
          }
        }
      }

      const newEquipment = { ...state.player.equipment };
      delete newEquipment[slot];

      result = { success: true, message: `卸下了【${item.name}】` };

      return {
        player: {
          ...state.player,
          stats: newStats,
          attributes: newAttributes,
          inventory: [...state.player.inventory, item],
          equipment: newEquipment,
        },
      };
    });
    return result;
  },

  addSkill: (skill) =>
    set((state) => ({
      player: state.player
        ? { ...state.player, skills: [...state.player.skills, skill] }
        : null,
    })),

  addTask: (task) =>
    set((state) => ({
      player: state.player
        ? { ...state.player, activeTasks: [...state.player.activeTasks, task] }
        : null,
    })),

  completeTask: (taskId) =>
    set((state) => {
      if (!state.player) return state;
      return {
        player: {
          ...state.player,
          activeTasks: state.player.activeTasks.filter((t) => t.id !== taskId),
          completedTasks: [...state.player.completedTasks, taskId],
        },
      };
    }),

  addAchievement: (achievementId) =>
    set((state) => {
      if (!state.player || state.player.achievements.includes(achievementId)) return state;
      return {
        player: {
          ...state.player,
          achievements: [...state.player.achievements, achievementId],
        },
        unlockedAchievements: state.unlockedAchievements.includes(achievementId)
          ? state.unlockedAchievements
          : [...state.unlockedAchievements, achievementId],
      };
    }),

  addHistory: (event) =>
    set((state) => ({
      player: state.player
        ? { ...state.player, history: [...state.player.history, event] }
        : null,
    })),

  createPlayer: (name, attributes, sceneType, systemId) => {
    const sysName = getSystemById(systemId)?.name || '基础系统';
    const player = createInitialPlayer(name, attributes, sceneType, systemId, sysName);
    set({ player });
    return player;
  },

  addTalent: (talent) =>
    set((state) => {
      if (!state.player) return state;
      if (state.player.talents.length >= 3) return state;
      if (state.player.talents.some((t) => t.id === talent.id)) return state;

      // Apply talent effects to player
      const newAttributes = { ...state.player.attributes };
      const newStats = { ...state.player.stats };
      const e = talent.effects;

      if (e.attrBonus) {
        for (const [k, v] of Object.entries(e.attrBonus)) {
          (newAttributes as Record<string, number>)[k] = Math.min(
            10,
            ((newAttributes as Record<string, number>)[k] || 0) + (v as number),
          );
        }
      }
      if (e.statBonus) {
        for (const [k, v] of Object.entries(e.statBonus)) {
          (newStats as Record<string, number>)[k] =
            ((newStats as Record<string, number>)[k] || 0) + (v as number);
        }
      }
      if (e.statBonus?.maxHp) {
        newStats.hp = Math.min(newStats.maxHp, newStats.hp + (e.statBonus.maxHp as number));
      }

      return {
        player: {
          ...state.player,
          talents: [...state.player.talents, talent],
          attributes: newAttributes,
          stats: newStats,
        },
      };
    }),

  hasTalent: (talentId): boolean => {
    const state = usePlayerStore.getState();
    return state.player?.talents.some((t: Talent) => t.id === talentId) ?? false;
  },

  resetPlayer: () => set({ player: null }),

  addVisitedScene: (scene) =>
    set((state) => ({
      visitedScenes: state.visitedScenes.includes(scene)
        ? state.visitedScenes
        : [...state.visitedScenes, scene],
    })),

  addGold: (amount) =>
    set((state) => {
      if (!state.player) return state;
      return {
        player: {
          ...state.player,
          stats: { ...state.player.stats, gold: state.player.stats.gold + amount },
        },
      };
    }),

  removeGold: (amount) => {
    let success = false;
    set((state) => {
      if (!state.player || state.player.stats.gold < amount) return state;
      success = true;
      return {
        player: {
          ...state.player,
          stats: { ...state.player.stats, gold: state.player.stats.gold - amount },
        },
      };
    });
    return success;
  },

  addArtifact: (artifact) =>
    set((state) => {
      if (!state.player) return state;
      if (state.player.artifacts.some((a) => a.id === artifact.id)) return state;
      return {
        player: {
          ...state.player,
          artifacts: [...state.player.artifacts, artifact],
        },
      };
    }),

  upgradeArtifact: (artifactId) => {
    let success = false;
    set((state) => {
      if (!state.player) return state;
      const idx = state.player.artifacts.findIndex((a) => a.id === artifactId);
      if (idx === -1) return state;
      const artifact = state.player.artifacts[idx];
      if (artifact.upgradeLevel >= artifact.maxUpgradeLevel) return state;
      success = true;
      const newArtifacts = [...state.player.artifacts];
      newArtifacts[idx] = { ...artifact, upgradeLevel: artifact.upgradeLevel + 1 };
      return { player: { ...state.player, artifacts: newArtifacts } };
    });
    return success;
  },

  updateSystemHistory: (partial) =>
    set((state) => {
      if (!state.player) return state;
      return {
        player: {
          ...state.player,
          systemHistory: { ...state.player.systemHistory, ...partial },
        },
      };
    }),

  applyCheckInRewards: (result) =>
    set((state) => {
      if (!state.player || !result.canCheckIn) return state;
      const newStats = { ...state.player.stats };
      const newAttrs = { ...state.player.attributes };
      const newInventory = [...state.player.inventory];
      const newArtifacts = [...state.player.artifacts];
      const newHistory = { ...state.player.systemHistory };

      for (const reward of result.rewards) {
        switch (reward.type) {
          case 'gold':
            newStats.gold += reward.amount || 0;
            newHistory.totalGoldIssued += reward.amount || 0;
            break;
          case 'exp':
            newStats.exp += reward.amount || 0;
            break;
          case 'item':
            if (reward.item) {
              newInventory.push(reward.item);
              newHistory.lastRewardItemIds = [...newHistory.lastRewardItemIds, reward.item.id].slice(-10);
            }
            break;
          case 'artifact':
            if (reward.artifact) {
              const existingIdx = newArtifacts.findIndex((a) => a.id === reward.artifact!.id);
              if (existingIdx >= 0) {
                newArtifacts[existingIdx] = { ...newArtifacts[existingIdx], ...reward.artifact };
              } else {
                newArtifacts.push(reward.artifact);
                newHistory.artifactIssueHistory = [
                  ...newHistory.artifactIssueHistory,
                  { artifactId: reward.artifact.id, issuedAtRound: state.player.progress.round },
                ];
              }
            }
            break;
          case 'attribute':
            if (reward.attribute) {
              for (const [k, v] of Object.entries(reward.attribute)) {
                (newAttrs as Record<string, number>)[k] = Math.min(
                  10,
                  ((newAttrs as Record<string, number>)[k] || 0) + (v as number),
                );
              }
            }
            break;
        }
      }

      newHistory.checkInStreak = result.streak;
      newHistory.lastCheckInRound = state.player.progress.round;

      return {
        player: {
          ...state.player,
          stats: newStats,
          attributes: newAttrs,
          inventory: newInventory,
          artifacts: newArtifacts,
          systemHistory: newHistory,
        },
      };
    }),
}));
