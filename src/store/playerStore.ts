import { create } from 'zustand';
import type {
  Player, Attributes, PlayerSystem, Stats, Progress, Item, Skill, HistoryEvent, Talent,
  NPCState, StoryMemory, WorldState, ExtendedSystemState, EndingProgress,
} from '../types';
import { getSystemById } from '../data/systems';
import { useItemEffect } from '../data/items';
import { getLevelFromExp } from '../config/gameConfig';

/** HP/MP 随战力动态计算 */
function calcMaxHp(physique: number, combatPower: number): number {
  return 100 + physique * 10 + Math.floor(combatPower * 0.3);
}
function calcMaxMp(intelligence: number, combatPower: number): number {
  return 50 + intelligence * 5 + Math.floor(combatPower * 0.15);
}

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
  addAchievement: (achievementId: string) => void;
  addHistory: (event: HistoryEvent) => void;
  createPlayer: (name: string, attributes: Attributes, sceneType: string, systemId: string) => Player;
  addTalent: (talent: Talent) => void;
  hasTalent: (talentId: string) => boolean;
  resetPlayer: () => void;
  addVisitedScene: (scene: string) => void;
  // ending.md.txt 新增
  updateStoryMemory: (memory: Partial<StoryMemory>) => void;
  addRecentEvent: (round: number, event: string) => void;
  addDecisionLog: (round: number, choice: string, result: string) => void;
  updateLongTermSummary: (summary: string) => void;
  addOrUpdateNPC: (npc: NPCState) => void;
  updateNPCRelationship: (npcId: string, delta: number) => void;
  setNPCLiving: (npcId: string, isAlive: boolean) => void;
  updateNPCMemory: (npcId: string, memory: string) => void;
  updateNPCStatus: (npcId: string, status: Partial<NPCState>) => void;
  updateWorldState: (state: Partial<WorldState>) => void;
  setGlobalFlag: (flag: string, value: boolean) => void;
  initializeEnding: (endingId: string) => void;
  updateEndingProgress: (progress: Partial<EndingProgress>) => void;
  updateExtendedSystem: (state: Partial<ExtendedSystemState>) => void;
}

export const createInitialPlayer = (
  name: string, attributes: Attributes, sceneType: string, systemId: string, systemName: string
): Player => {
  const cp = attributes.physique * 50 + attributes.talent * 100;
  return {
    id: `save_${Date.now()}`, name, createdAt: Date.now(), attributes,
    stats: {
      level: 1, exp: 0,
      hp: calcMaxHp(attributes.physique, cp), maxHp: calcMaxHp(attributes.physique, cp),
      mp: calcMaxMp(attributes.intelligence, cp), maxMp: calcMaxMp(attributes.intelligence, cp),
      combatPower: cp, wealth: attributes.family * 5000, fame: 0,
    },
    system: { id: systemId, name: systemName, level: 1, exp: 0, features: ['basic_feature'] },
    progress: { sceneType: sceneType as any, sceneLevel: 1, round: 1, age: Math.floor(Math.random() * 5) + 16, storyFlags: [] },
    inventory: [], equipment: {}, skills: [],
    achievements: [], history: [], talents: [],
    npcs: [], relationships: {},
    storyMemory: { longTermSummary: '', recentEvents: [], decisionLog: [] },
    worldState: { currentLocation: '新手村', timeline: '第一天·清晨', globalFlags: {} },
    extendedSystem: { dialogueStyle: '毒舌' },
    endingProgress: { targetEndingId: '', conditionStatus: {}, isFailed: false },
  };
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  player: null,
  unlockedAchievements: [],
  visitedScenes: [],

  setPlayer: (player) => set({ player }),

  updateAttributes: (attrs) =>
    set((state) => ({ player: state.player ? { ...state.player, attributes: { ...state.player.attributes, ...attrs } } : null })),

  updateStats: (stats) =>
    set((state) => {
      if (!state.player) return { player: null };
      const newStats = { ...state.player.stats, ...stats };
      if (stats.exp !== undefined) {
        const newLevel = getLevelFromExp(newStats.exp);
        if (newLevel > newStats.level) {
          newStats.level = newLevel;
          newStats.combatPower += 15;
        }
      }
      // HP/MP 随战力动态更新
      if (stats.combatPower !== undefined || stats.physique !== undefined || stats.intelligence !== undefined) {
        const attr = state.player.attributes;
        const cp = newStats.combatPower;
        newStats.maxHp = calcMaxHp(attr.physique, cp);
        newStats.hp = Math.min(newStats.hp, newStats.maxHp);
        newStats.maxMp = calcMaxMp(attr.intelligence, cp);
        newStats.mp = Math.min(newStats.mp, newStats.maxMp);
      }
      return { player: { ...state.player, stats: newStats } };
    }),

  updateSystem: (system) => set((state) => ({ player: state.player ? { ...state.player, system: { ...state.player.system, ...system } } : null })),
  updateProgress: (p) => set((state) => ({ player: state.player ? { ...state.player, progress: { ...state.player.progress, ...p } } : null })),
  addItem: (item) => set((state) => ({ player: state.player ? { ...state.player, inventory: [...state.player.inventory, item] } : null })),
  removeItem: (id) => set((state) => ({ player: state.player ? { ...state.player, inventory: state.player.inventory.filter((i) => i.id !== id) } : null })),

  useItem: (itemId) => {
    let result = { success: false, message: '使用失败', effects: {} as Record<string, number> };
    set((state) => {
      if (!state.player) return state;
      const item = state.player.inventory.find((i) => i.id === itemId);
      if (!item) return state;
      const effects = useItemEffect(item);
      const newStats = { ...state.player.stats }, newAttrs = { ...state.player.attributes };
      let msg = `使用了【${item.name}】`;
      for (const [k, v] of Object.entries(effects)) {
        if (k === 'hp') { newStats.hp = Math.min(newStats.maxHp, newStats.hp + v); msg += `，生命恢复${v}点`; }
        else if (k === 'mp') { newStats.mp = Math.min(newStats.maxMp, newStats.mp + v); msg += `，灵力恢复${v}点`; }
        else if (k === 'exp') { newStats.exp += v; msg += `，获得${v}经验`; }
        else if (k === 'wealth') { newStats.wealth = Math.max(0, newStats.wealth + v); msg += v > 0 ? `，获得${v}财富` : `，消耗${Math.abs(v)}财富`; }
        else if (k === 'combatPower') { newStats.combatPower += v; msg += `，战斗力提升${v}`; }
        else if (['talent', 'appearance', 'intelligence', 'physique', 'family', 'luck'].includes(k)) { (newAttrs as any)[k] += v; msg += `，${k}提升${v}`; }
      }
      const newLevel = getLevelFromExp(newStats.exp);
      if (newLevel > newStats.level) { newStats.level = newLevel; newStats.combatPower += 15; msg += `，升级至${newLevel}级！`; }
      // 更新 HP/MP 上限
      newStats.maxHp = calcMaxHp(newAttrs.physique, newStats.combatPower);
      newStats.maxMp = calcMaxMp(newAttrs.intelligence, newStats.combatPower);
      result = { success: true, message: msg, effects };
      return { player: { ...state.player, stats: newStats, attributes: newAttrs, inventory: item.type === 'consumable' ? state.player.inventory.filter((i) => i.id !== itemId) : state.player.inventory } };
    });
    return result;
  },

  equipItem: (itemId) => {
    let result = { success: false, message: '装备失败' };
    set((state) => {
      if (!state.player) return state;
      const item = state.player.inventory.find((i) => i.id === itemId);
      if (!item) return state;
      const equipType = item.type === 'skill_book' ? 'accessory' : item.type;
      if (equipType !== 'weapon' && equipType !== 'armor' && equipType !== 'accessory') { result = { success: false, message: '该物品无法装备' }; return state; }
      const slot = equipType as 'weapon' | 'armor' | 'accessory';
      let newInv = [...state.player.inventory], newEquip = { ...state.player.equipment };
      const cur = newEquip[slot];
      if (cur) newInv = [...newInv, cur];
      newInv = newInv.filter((i) => i.id !== itemId);
      newEquip[slot] = item;
      const newStats = { ...state.player.stats }, newAttrs = { ...state.player.attributes };
      if (item.effect) {
        for (const [k, v] of Object.entries(item.effect)) {
          if (k === 'maxHp') { newStats.maxHp += v; newStats.hp += v; }
          else if (k === 'maxMp') { newStats.maxMp += v; newStats.mp += v; }
          else if (k === 'combatPower') { newStats.combatPower += v; }
          else if (['talent', 'appearance', 'intelligence', 'physique', 'family', 'luck'].includes(k)) { (newAttrs as any)[k] += v; }
          else if (k === 'exp') newStats.exp += v;
          else if (k === 'wealth') newStats.wealth += v;
        }
      }
      // 更新 HP/MP
      newStats.maxHp = calcMaxHp(newAttrs.physique, newStats.combatPower);
      newStats.hp = Math.min(newStats.hp, newStats.maxHp);
      newStats.maxMp = calcMaxMp(newAttrs.intelligence, newStats.combatPower);
      newStats.mp = Math.min(newStats.mp, newStats.maxMp);
      result = { success: true, message: `装备了【${item.name}】` };
      return { player: { ...state.player, stats: newStats, attributes: newAttrs, inventory: newInv, equipment: newEquip } };
    });
    return result;
  },

  unequipItem: (slot) => {
    let result = { success: false, message: '卸下失败' };
    set((state) => {
      if (!state.player) return state;
      const item = state.player.equipment[slot];
      if (!item) { result = { success: false, message: '该部位没有装备' }; return state; }
      const newStats = { ...state.player.stats }, newAttrs = { ...state.player.attributes };
      if (item.effect) {
        for (const [k, v] of Object.entries(item.effect)) {
          if (k === 'maxHp') { newStats.maxHp = Math.max(1, newStats.maxHp - v); newStats.hp = Math.min(newStats.hp, newStats.maxHp); }
          else if (k === 'maxMp') { newStats.maxMp = Math.max(1, newStats.maxMp - v); newStats.mp = Math.min(newStats.mp, newStats.maxMp); }
          else if (k === 'combatPower') { newStats.combatPower = Math.max(0, newStats.combatPower - v); }
          else if (['talent', 'appearance', 'intelligence', 'physique', 'family', 'luck'].includes(k)) { (newAttrs as any)[k] = Math.max(1, (newAttrs as any)[k] - v); }
        }
      }
      newStats.maxHp = calcMaxHp(newAttrs.physique, newStats.combatPower);
      newStats.hp = Math.min(newStats.hp, newStats.maxHp);
      newStats.maxMp = calcMaxMp(newAttrs.intelligence, newStats.combatPower);
      newStats.mp = Math.min(newStats.mp, newStats.maxMp);
      const newEquip = { ...state.player.equipment }; delete newEquip[slot];
      result = { success: true, message: `卸下了【${item.name}】` };
      return { player: { ...state.player, stats: newStats, attributes: newAttrs, inventory: [...state.player.inventory, item], equipment: newEquip } };
    });
    return result;
  },

  addSkill: (s) => set((state) => ({ player: state.player ? { ...state.player, skills: [...state.player.skills, s] } : null })),
  addAchievement: (id) => set((state) => {
    if (!state.player || state.player.achievements.includes(id)) return state;
    return { player: { ...state.player, achievements: [...state.player.achievements, id] }, unlockedAchievements: state.unlockedAchievements.includes(id) ? state.unlockedAchievements : [...state.unlockedAchievements, id] };
  }),
  addHistory: (e) => set((state) => ({ player: state.player ? { ...state.player, history: [...state.player.history, e] } : null })),

  createPlayer: (name, attributes, sceneType, systemId) => {
    const sysName = getSystemById(systemId)?.name || '基础系统';
    const player = createInitialPlayer(name, attributes, sceneType, systemId, sysName);
    set({ player }); return player;
  },

  addTalent: (talent) => set((state) => {
    if (!state.player || state.player.talents.length >= 3 || state.player.talents.some((t) => t.id === talent.id)) return state;
    const newAttrs = { ...state.player.attributes }, newStats = { ...state.player.stats };
    const e = talent.effects;
    if (e.attrBonus) { for (const [k, v] of Object.entries(e.attrBonus)) (newAttrs as any)[k] = Math.min(10, ((newAttrs as any)[k] || 0) + (v as number)); }
    if (e.statBonus) {
      for (const [k, v] of Object.entries(e.statBonus)) (newStats as any)[k] = ((newStats as any)[k] || 0) + (v as number);
      // 战力变化时更新 HP/MP
      if (e.statBonus.combatPower) {
        newStats.maxHp = calcMaxHp(newAttrs.physique, newStats.combatPower);
        newStats.hp = newStats.maxHp;
        newStats.maxMp = calcMaxMp(newAttrs.intelligence, newStats.combatPower);
        newStats.mp = newStats.maxMp;
      }
    }
    return { player: { ...state.player, talents: [...state.player.talents, talent], attributes: newAttrs, stats: newStats } };
  }),

  hasTalent: (talentId) => { const st = usePlayerStore.getState(); return st.player?.talents.some((t: Talent) => t.id === talentId) ?? false; },
  resetPlayer: () => set({ player: null }),
  addVisitedScene: (s) => set((state) => ({ visitedScenes: state.visitedScenes.includes(s) ? state.visitedScenes : [...state.visitedScenes, s] })),

  // ending.md.txt 新增方法
  updateStoryMemory: (m) => set((state) => ({ player: state.player ? { ...state.player, storyMemory: { ...state.player.storyMemory, ...m } } : null })),
  addRecentEvent: (round, event) => set((state) => {
    if (!state.player) return state;
    return { player: { ...state.player, storyMemory: { ...state.player.storyMemory, recentEvents: [...state.player.storyMemory.recentEvents, { round, event }] } } };
  }),
  addDecisionLog: (round, choice, result) => set((state) => {
    if (!state.player) return state;
    return { player: { ...state.player, storyMemory: { ...state.player.storyMemory, decisionLog: [...state.player.storyMemory.decisionLog, { round, choice, result }] } } };
  }),
  updateLongTermSummary: (s) => set((state) => {
    if (!state.player) return state;
    return { player: { ...state.player, storyMemory: { ...state.player.storyMemory, longTermSummary: s } } };
  }),
  addOrUpdateNPC: (npc) => set((state) => {
    if (!state.player) return state;
    const idx = state.player.npcs.findIndex((n) => n.npcId === npc.npcId);
    const newNpcs = idx >= 0 ? state.player.npcs.map((n, i) => i === idx ? { ...n, ...npc } : n) : [...state.player.npcs, npc];
    const newRel = { ...state.player.relationships };
    if (idx < 0) newRel[npc.name] = npc.relationship;
    return { player: { ...state.player, npcs: newNpcs, relationships: newRel } };
  }),
  updateNPCRelationship: (npcId, delta) => set((state) => {
    if (!state.player) return state;
    const npc = state.player.npcs.find((n) => n.npcId === npcId);
    if (!npc) return state;
    const newRel = Math.max(-100, Math.min(100, npc.relationship + delta));
    return { player: { ...state.player, npcs: state.player.npcs.map((n) => n.npcId === npcId ? { ...n, relationship: newRel } : n), relationships: { ...state.player.relationships, [npc.name]: newRel } } };
  }),
  setNPCLiving: (npcId, alive) => set((state) => ({ player: state.player ? { ...state.player, npcs: state.player.npcs.map((n) => n.npcId === npcId ? { ...n, isAlive: alive } : n) } : null })),
  updateNPCMemory: (npcId, mem) => set((state) => ({ player: state.player ? { ...state.player, npcs: state.player.npcs.map((n) => n.npcId === npcId ? { ...n, memoryOfPlayer: [...n.memoryOfPlayer.slice(-4), mem] } : n) } : null })),
  updateNPCStatus: (npcId, st) => set((state) => ({ player: state.player ? { ...state.player, npcs: state.player.npcs.map((n) => n.npcId === npcId ? { ...n, ...st } : n) } : null })),
  updateWorldState: (ws) => set((state) => ({ player: state.player ? { ...state.player, worldState: { ...state.player.worldState, ...ws } } : null })),
  setGlobalFlag: (flag, val) => set((state) => {
    if (!state.player) return state;
    return { player: { ...state.player, worldState: { ...state.player.worldState, globalFlags: { ...state.player.worldState.globalFlags, [flag]: val } } } };
  }),
  initializeEnding: (endingId) => set((state) => ({ player: state.player ? { ...state.player, endingProgress: { ...state.player.endingProgress, targetEndingId: endingId } } : null })),
  updateEndingProgress: (p) => set((state) => ({ player: state.player ? { ...state.player, endingProgress: { ...state.player.endingProgress, ...p } } : null })),
  updateExtendedSystem: (es) => set((state) => ({ player: state.player ? { ...state.player, extendedSystem: { ...state.player.extendedSystem, ...es } } : null })),
}));
