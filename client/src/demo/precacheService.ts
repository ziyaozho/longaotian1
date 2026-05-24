import type { TurnResult } from '../agents/orchestrator';

interface PrecacheEntry {
  version: string;
  generatedAt: string;
  events: Record<string, TurnResult>;
}

let cache: PrecacheEntry | null = null;

export async function loadPrecache(): Promise<PrecacheEntry> {
  if (cache) return cache;
  const mod = await import('./precache/demo_v1.json');
  cache = mod.default as unknown as PrecacheEntry;
  return cache;
}

export function getPrecachedTurn(eventId: string): TurnResult | null {
  return cache?.events[eventId] ?? null;
}

export function getPrecacheVersion(): string | null {
  return cache?.version ?? null;
}

export function isPrecacheLoaded(): boolean {
  return cache !== null;
}
