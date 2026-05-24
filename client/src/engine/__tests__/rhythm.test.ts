import { describe, it, expect } from 'vitest';
import { createRhythmController } from '../rhythm';
import type { Player } from '../../types';

const mockPlayer = (level = 1, luck = 5): Player => ({
  stats: { level, combatPower: 100, exp: 0, hp: 100, maxHp: 100, mp: 50, maxMp: 50, wealth: 0, fame: 0, gold: 0 },
  progress: { round: 1, sceneType: 'modern_city' as const, sceneLevel: 1, age: 20, storyFlags: [] },
  attributes: { luck, talent: 5, appearance: 5, intelligence: 5, physique: 5, family: 5 },
  id: 'test', name: 'test', createdAt: 0,
  system: { id: 'sys', name: 'test', level: 1, exp: 0, features: [] },
  inventory: [], equipment: {}, skills: [], activeTasks: [], completedTasks: [], achievements: [], history: [], talents: [],
  npcStatuses: {}, artifacts: [],
  systemHistory: { checkInStreak: 0, lastCheckInRound: 0, lastRewardItemIds: [], totalGoldIssued: 0, artifactIssueHistory: [] },
});

describe('RhythmController', () => {
  it('starts in building-up state', () => {
    const rc = createRhythmController();
    const state = rc.tick(1, mockPlayer());
    expect(state.isBuildingUp).toBe(true);
    expect(state.isPeak).toBe(false);
    expect(state.isCoolingDown).toBe(false);
  });

  it('eventually triggers a peak after enough turns', () => {
    const rc = createRhythmController();
    // Call tick many times — with enough turns a peak must trigger due to PEAK_CHANCE_BASE=5
    let hadPeak = false;
    for (let turn = 1; turn <= 30; turn++) {
      const state = rc.tick(turn, mockPlayer());
      if (state.isPeak) {
        hadPeak = true;
        break;
      }
    }
    expect(hadPeak).toBe(true);
  });

  it('guarantees minimum 3 turn gap between peaks', () => {
    const rc = createRhythmController();
    let lastPeakTurn = -10;
    for (let turn = 1; turn <= 30; turn++) {
      const state = rc.tick(turn, mockPlayer());
      if (state.isPeak) {
        if (lastPeakTurn >= 0) {
          // After a peak, cooldown lasts 2 turns, then building resumes.
          // The next peak can fire at earliest on the 3rd tick after a peak.
          expect(turn - lastPeakTurn).toBeGreaterThanOrEqual(MIN_TURNS_BETWEEN_PEAKS);
        }
        lastPeakTurn = turn;
      }
    }
  });

  it('enters cooldown after peak', () => {
    const rc = createRhythmController();
    let peakTurn = -1;
    for (let turn = 1; turn <= 30; turn++) {
      const state = rc.tick(turn, mockPlayer());
      if (state.isPeak && peakTurn === -1) {
        peakTurn = turn;
        break;
      }
    }
    expect(peakTurn).toBeGreaterThan(0);
    // Next turn after peak should be cooldown
    const nextState = rc.tick(peakTurn + 1, mockPlayer());
    expect(nextState.isCoolingDown).toBe(true);
    expect(nextState.isPeak).toBe(false);
  });

  it('getState returns current state without advancing', () => {
    const rc = createRhythmController();
    rc.tick(1, mockPlayer());
    const s1 = rc.getState();
    const s2 = rc.getState();
    expect(s1.turnsSinceLastPeak).toBe(s2.turnsSinceLastPeak);
  });

  it('reset clears state back to initial', () => {
    const rc = createRhythmController();
    rc.tick(1, mockPlayer());
    rc.tick(2, mockPlayer());
    rc.reset();
    const state = rc.getState();
    expect(state.turnsSinceLastPeak).toBe(0);
    expect(state.isBuildingUp).toBe(true);
    expect(state.isPeak).toBe(false);
  });
});

const MIN_TURNS_BETWEEN_PEAKS = 3;
