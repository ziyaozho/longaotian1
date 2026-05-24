import { create } from 'zustand';
import type { GameState, GameScreen, GameEvent, Choice, ImportantEvent } from '../types';
import type { CharacterMood } from '../components/character';
import { dbAddLog } from '../db/database';

interface GameStore extends GameState {
  characterMood: CharacterMood;
  importantEvents: ImportantEvent[];
  setScreen: (screen: GameScreen) => void;
  setLoading: (loading: boolean) => void;
  setCurrentScene: (scene: string) => void;
  setCurrentChoices: (choices: Choice[]) => void;
  setCurrentEvent: (event: GameEvent | null) => void;
  setSystemMessage: (message: string | null) => void;
  setCharacterMood: (mood: Partial<CharacterMood>) => void;
  addNewAchievement: (id: string) => void;
  clearNewAchievements: () => void;
  addImportantEvent: (event: Omit<ImportantEvent, 'id' | 'timestamp'>) => void;
  addLog: (log: string) => void;
  clearLogs: () => void;
  addSystemLog: (playerId: string, type: 'info' | 'reward' | 'upgrade' | 'warning' | 'error', text: string) => void;
  resetGame: () => void;
}

const initialMood: CharacterMood = {
  expression: 'neutral',
  intensity: 0,
  enteredAt: 0,
};

const initialState: GameState & { importantEvents: ImportantEvent[] } = {
  screen: 'start',
  isLoading: false,
  currentScene: '',
  currentChoices: [],
  currentEvent: null,
  systemMessage: null,
  newAchievements: [],
  logs: [],
  importantEvents: [],
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  characterMood: initialMood,
  importantEvents: [],

  setScreen: (screen) => set({ screen }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentScene: (currentScene) => set({ currentScene }),
  setCurrentChoices: (currentChoices) => set({ currentChoices }),
  setCurrentEvent: (currentEvent) => set({ currentEvent }),
  setSystemMessage: (systemMessage) => set({ systemMessage }),
  setCharacterMood: (mood) =>
    set((state) => ({
      characterMood: { ...state.characterMood, ...mood, enteredAt: Date.now() },
    })),
  addNewAchievement: (id) =>
    set((state) => ({
      newAchievements: [...state.newAchievements, id],
    })),
  clearNewAchievements: () => set({ newAchievements: [] }),
  addImportantEvent: (event) =>
    set((state) => ({
      importantEvents: [{ ...event, id: Date.now(), timestamp: Date.now() }, ...state.importantEvents.slice(0, 29)],
    })),
  addLog: (log) =>
    set((state) => ({
      logs: [log, ...state.logs.slice(0, 49)],
    })),
  clearLogs: () => set({ logs: [] }),
  addSystemLog: (playerId, type, text) => {
    dbAddLog({ playerId, type, text, timestamp: Date.now() });
  },
  resetGame: () => set({ ...initialState, importantEvents: [] }),
}));
