// 3×2 grid spritesheet: 3 columns × 2 rows = 6 expressions
// Panel layout (col, row):
//   (0,0) neutral  | (1,0) happy    | (2,0) angry
//   (0,1) sad      | (1,1) surprised | (2,1) determined
export const SPRITE = {
  width: 768,
  height: 512,
  panelSize: 256,
  cols: 3,
  rows: 2,
  panelCount: 6,
} as const;

export const PANEL_POSITIONS: Record<number, { col: number; row: number }> = {
  0: { col: 0, row: 0 }, // neutral
  1: { col: 1, row: 0 }, // happy
  2: { col: 2, row: 0 }, // angry
  3: { col: 0, row: 1 }, // sad
  4: { col: 1, row: 1 }, // surprised
  5: { col: 2, row: 1 }, // determined
};

export const COLORS = {
  ink: '#1a1a1a',
  paper: '#f5f0e8',
  card: '#ffffff',

  world: {
    modern_city: '#4a90d9',
    cultivation: '#6b3fa0',
    urban_fantasy: '#2980b9',
    apocalypse: '#c0392b',
    apoc_fantasy: '#8e44ad',
    hidden_immortal: '#d4a017',
    hidden_cyber: '#00e5ff',
    hidden_demon: '#ff1744',
  },

  effects: {
    hpLow: 'rgba(192, 57, 43, 0.3)',
    buffGlow: 'rgba(212, 160, 23, 0.4)',
    anger: '#e74c3c',
    worldAura: 'rgba(107, 63, 160, 0.15)',
  },
} as const;

export const MOOD_DECAY_MS = 4000;
