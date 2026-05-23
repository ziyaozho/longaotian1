export const GAME_CONFIG = {
  initialPoints: 20,
  minAttribute: 1,
  maxAttribute: 10,
  maxAgeBase: 80,
  expPerLevel: 100,
  expMultiplier: 1.5,
  hpPerPhysique: 10,
  mpPerIntelligence: 5,
  combatPowerPerPhysique: 5,
  combatPowerPerTalent: 3,
  wealthPerFamily: 200,
  luckEventProbability: 0.3,
  randomEventProbability: 0.4,
  taskGenerateProbability: 0.5,
  systemExpPerTask: 10,
  maxHistoryEvents: 100,
  maxLogs: 50,
};

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
  3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450,
];

export const getLevelFromExp = (exp: number): number => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
};

export const getExpForNextLevel = (level: number): number => {
  if (level < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level];
  }
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length + 1) * 1000;
};

export const REALM_COLORS = [
  'text-gray-400',
  'text-green-400',
  'text-blue-400',
  'text-purple-400',
  'text-orange-400',
  'text-red-400',
  'text-yellow-400',
  'text-pink-400',
];

export const RARITY_COLORS = {
  common: 'text-gray-400 border-gray-600',
  rare: 'text-blue-400 border-blue-600',
  epic: 'text-purple-400 border-purple-600',
  legendary: 'text-orange-400 border-orange-600',
  hidden: 'text-red-400 border-red-600',
};

export const RARITY_LABELS = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  hidden: '隐藏',
};
