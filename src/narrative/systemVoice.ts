export type VoiceMode = 'roast' | 'hype' | 'heartfelt' | 'daily';

export interface VoiceConfig {
  mode: VoiceMode;
  intensity: number;
  memeLevel: 'light' | 'medium' | 'heavy';
}

export interface VoiceContext {
  playerLevel: number;
  eventType: string;
  success: boolean;
  roundNumber: number;
  sceneType: string;
}

const BREAKTHROUGH_LEVELS = new Set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

const GRAVE_EVENTS = new Set([
  'game_over', 'companion_death', 'ultimate_sacrifice', 'season_end',
]);

const HYPE_EVENTS = new Set([
  'breakthrough_success', 'loot_explosion', 'face_slap',
  'kill_enemy', 'boss_kill', 'achievement_unlock',
]);

const FAILURE_EVENTS = new Set([
  'breakthrough_fail', 'combat_loss', 'lose_wealth', 'bad_choice',
]);

const DAILY_EVENTS = new Set([
  'daily_signin', 'shop_open', 'basic_lottery', 'normal_dungeon',
]);

export function getVoiceMode(context: VoiceContext): VoiceConfig {
  const { playerLevel, eventType, success } = context;

  if (GRAVE_EVENTS.has(eventType)) {
    return { mode: 'heartfelt', intensity: 0.9, memeLevel: 'light' };
  }

  if (HYPE_EVENTS.has(eventType)) {
    const isBigBreakthrough = eventType === 'breakthrough_success'
      && BREAKTHROUGH_LEVELS.has(playerLevel);
    return {
      mode: 'hype',
      intensity: isBigBreakthrough ? 1.0 : 0.8,
      memeLevel: isBigBreakthrough ? 'heavy' : 'medium',
    };
  }

  if (!success || FAILURE_EVENTS.has(eventType)) {
    const isBigFail = playerLevel >= 30 && eventType === 'breakthrough_fail';
    return {
      mode: 'roast',
      intensity: isBigFail ? 0.7 : 0.4,
      memeLevel: isBigFail ? 'medium' : 'light',
    };
  }

  if (DAILY_EVENTS.has(eventType)) {
    return { mode: 'daily', intensity: 0.3, memeLevel: 'light' };
  }

  return { mode: 'daily', intensity: 0.3, memeLevel: 'light' };
}

export function getSystemLine(
  template: string,
  _config: VoiceConfig,
  context: Record<string, unknown>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && value !== null) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
  }
  return result;
}
