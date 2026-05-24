import { describe, it, expect } from 'vitest';
import { getVoiceMode, getSystemLine, type VoiceContext } from '../systemVoice';

describe('getVoiceMode', () => {
  it('returns roast mode for player failure', () => {
    const ctx: VoiceContext = {
      playerLevel: 5, eventType: 'breakthrough_fail',
      success: false, roundNumber: 10, sceneType: 'cultivation',
    };
    const config = getVoiceMode(ctx);
    expect(config.mode).toBe('roast');
  });

  it('returns hype mode for level threshold breakthrough', () => {
    const ctx: VoiceContext = {
      playerLevel: 10, eventType: 'breakthrough_success',
      success: true, roundNumber: 15, sceneType: 'cultivation',
    };
    const config = getVoiceMode(ctx);
    expect(config.mode).toBe('hype');
  });

  it('returns heartfelt mode for game over scenario', () => {
    const ctx: VoiceContext = {
      playerLevel: 50, eventType: 'game_over',
      success: true, roundNumber: 80, sceneType: 'apocalypse',
    };
    const config = getVoiceMode(ctx);
    expect(config.mode).toBe('heartfelt');
    expect(config.memeLevel).toBe('light');
  });

  it('returns daily mode for signin', () => {
    const ctx: VoiceContext = {
      playerLevel: 3, eventType: 'daily_signin',
      success: true, roundNumber: 1, sceneType: 'modern_city',
    };
    const config = getVoiceMode(ctx);
    expect(config.mode).toBe('daily');
  });
});

describe('getSystemLine', () => {
  it('renders template with context variables', () => {
    const line = getSystemLine(
      '宿主你已踏入{realmName}，战力{combatPower}！',
      { mode: 'hype', intensity: 0.8, memeLevel: 'medium' },
      { realmName: '金丹期', combatPower: '5000' }
    );
    expect(line).toContain('金丹期');
    expect(line).toContain('5000');
  });

  it('returns raw template when no variables match', () => {
    const line = getSystemLine(
      '宿主加油',
      { mode: 'daily', intensity: 0.3, memeLevel: 'light' },
      {}
    );
    expect(line).toBe('宿主加油');
  });
});
