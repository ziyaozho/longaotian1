import type { Player } from '../types';

export type PeakType = 'breakthrough' | 'loot_explosion' | 'face_slap' | 'fortune';

export interface RhythmState {
  turnsSinceLastPeak: number;
  nextPeakType: PeakType | null;
  isBuildingUp: boolean;
  isPeak: boolean;
  isCoolingDown: boolean;
}

interface RhythmController {
  tick: (currentTurn: number, player: Player) => RhythmState;
  getState: () => RhythmState;
  reset: () => void;
}

const MIN_TURNS_BETWEEN_PEAKS = 3;
const PEAK_CHANCE_BASE = 5;
const COOLDOWN_DURATION = 2;

const PEAK_TYPES: PeakType[] = ['breakthrough', 'loot_explosion', 'face_slap', 'fortune'];

function pickPeakType(): PeakType {
  return PEAK_TYPES[Math.floor(Math.random() * PEAK_TYPES.length)];
}

export function createRhythmController(): RhythmController {
  let state: RhythmState = {
    turnsSinceLastPeak: 0,
    nextPeakType: null,
    isBuildingUp: true,
    isPeak: false,
    isCoolingDown: false,
  };

  return {
    tick(_currentTurn: number, player: Player): RhythmState {
      if (state.isCoolingDown) {
        state.turnsSinceLastPeak += 1;
        if (state.turnsSinceLastPeak >= COOLDOWN_DURATION) {
          state.isCoolingDown = false;
          state.isBuildingUp = true;
          state.nextPeakType = null;
        }
        state.isPeak = false;
        return { ...state };
      }

      state.turnsSinceLastPeak += 1;
      state.isPeak = false;

      if (state.turnsSinceLastPeak >= MIN_TURNS_BETWEEN_PEAKS) {
        const extraChance = (state.turnsSinceLastPeak - MIN_TURNS_BETWEEN_PEAKS) * 0.15;
        const triggerChance = 0.2 + extraChance + player.attributes.luck * 0.01;

        if (Math.random() < triggerChance || state.turnsSinceLastPeak >= PEAK_CHANCE_BASE) {
          state.isPeak = true;
          state.isBuildingUp = false;
          state.nextPeakType = pickPeakType();
          state.turnsSinceLastPeak = 0;
          state.isCoolingDown = true;
        }
      }

      return { ...state };
    },

    getState(): RhythmState {
      return { ...state };
    },

    reset(): void {
      state = {
        turnsSinceLastPeak: 0,
        nextPeakType: null,
        isBuildingUp: true,
        isPeak: false,
        isCoolingDown: false,
      };
    },
  };
}
