// The 6 sprite panel indices
export type SpritePanel = 0 | 1 | 2 | 3 | 4 | 5;

export const SPRITE_LABELS: Record<SpritePanel, string> = {
  0: 'neutral',
  1: 'happy',
  2: 'angry',
  3: 'sad',
  4: 'surprised',
  5: 'determined',
};

export type Expression =
  | 'neutral'
  | 'happy'
  | 'injured'
  | 'determined'
  | 'surprised'
  | 'angry'
  | 'sad'
  | 'triumphant'
  | 'worried'
  | 'awe';

// Map 10 semantic expressions → 6 sprite panels
export const EXPRESSION_TO_PANEL: Record<Expression, SpritePanel> = {
  neutral: 0,
  happy: 1,
  angry: 2,
  injured: 2,
  sad: 3,
  worried: 3,
  surprised: 4,
  awe: 4,
  determined: 5,
  triumphant: 5,
};

export const PANEL_LABELS: Record<SpritePanel, string> = {
  0: '普通',
  1: '开心',
  2: '愤怒',
  3: '悲伤',
  4: '惊讶',
  5: '坚毅',
};

export interface CharacterMood {
  expression: Expression;
  intensity: number;
  enteredAt: number;
}

export interface CharacterAppearance {
  talent: number;
  appearance: number;
  intelligence: number;
  physique: number;
  family: number;
  luck: number;
}

export interface CharacterState {
  appearance: CharacterAppearance;
  mood: CharacterMood;
  world: string;
  level: number;
  hpPercent: number;
  hasWeapon: boolean;
  hasArmor: boolean;
}

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';
