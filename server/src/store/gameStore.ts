import { create } from 'zustand';
import type { GameState, GameScreen, GameEvent, Choice } from '../types';
import type { CharacterMood } from '../components/character';

interface GameStore extends GameState {
  characterMood: CharacterMood;
  setScreen: (screen: GameScreen) => void;
  setLoading: (loading: boolean) => void;
  setCurrentScene: (scene: string) => void;
  setCurrentChoices: (choices: Choice[]) => void;
  setCurrentEvent: (event: GameEvent | null) => void;
  setSystemMessage: (message: string | null) => void;
  setCharacterMood: (mood: Partial<CharacterMood>) => void;
  addNewAchievement: (id: string) => void;
  clearNewAchievements: () => void;
  addLog: (log: string) => void;
  clearLogs: () => void;
  resetGame: () => void;
}

const initialMood: CharacterMood = {
  expression: 'neutral',
  intensity: 0,
  enteredAt: 0,
};

const initialState: GameState = {
  screen: 'start',
  isLoading: false,
  currentScene: '',
  currentChoices: [],
  currentEvent: null,
  systemMessage: null,
  newAchievements: [],
  logs: [],
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  characterMood: initialMood,

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
  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs.slice(-49), log],
    })),
  clearLogs: () => set({ logs: [] }),
  resetGame: () => set(initialState),
}));
