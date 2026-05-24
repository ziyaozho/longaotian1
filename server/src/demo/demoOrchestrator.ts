import type { Player } from '../types';
import type { TurnResult } from '../agents/orchestrator';
import { loadPrecache, getPrecachedTurn } from './precacheService';
import { DEMO_PHASES, type DemoPhase, type DemoPhaseConfig } from './demoConfig';

let currentPhaseIndex = 0;
let isPaused = false;

export function resetDemo(): void {
  currentPhaseIndex = 0;
  isPaused = false;
}

export function getCurrentPhase(): DemoPhaseConfig | null {
  return DEMO_PHASES[currentPhaseIndex] ?? null;
}

export function advancePhase(): DemoPhaseConfig | null {
  currentPhaseIndex = Math.min(currentPhaseIndex + 1, DEMO_PHASES.length - 1);
  return getCurrentPhase();
}

export function skipToPhase(phase: DemoPhase): void {
  const idx = DEMO_PHASES.findIndex((p) => p.id === phase);
  if (idx >= 0) currentPhaseIndex = idx;
}

export function togglePause(): boolean {
  isPaused = !isPaused;
  return isPaused;
}

export function getDemoPhaseIndex(): number {
  return currentPhaseIndex;
}

export function getDemoPhaseCount(): number {
  return DEMO_PHASES.length;
}

export function isDemoPaused(): boolean {
  return isPaused;
}

export async function executeDemoTurn(
  _player: Player,
): Promise<TurnResult> {

  await loadPrecache();
  const phase = DEMO_PHASES[currentPhaseIndex];
  if (!phase) {
    throw new Error(`No demo phase at index ${currentPhaseIndex}`);
  }

  const cached = getPrecachedTurn(phase.precacheEventId);
  if (cached) {
    return { ...cached, usedFallback: false };
  }

  const fallback = getPrecachedTurn('char_create');
  if (fallback) {
    console.warn(`Demo cache miss for "${phase.precacheEventId}", using char_create fallback`);
    return { ...fallback, usedFallback: true };
  }

  throw new Error('Demo precache is empty. Run "pnpm run precache" first.');
}
