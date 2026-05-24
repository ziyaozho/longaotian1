import { describe, it, expect } from 'vitest';
import { packageEvent, ALL_EVENT_TYPES } from '../memePackager';

describe('packageEvent', () => {
  it('returns system message and toast for victory event', () => {
    const result = packageEvent('kill_enemy', { enemyName: '丧尸王' });
    expect(result.systemMessage).toContain('丧尸王');
    expect(result.toastText).toBeTruthy();
    expect(result.icon).toBe('zap');
    expect(result.color).toBe('#d4a017');
  });

  it('returns system message for breakthrough fail', () => {
    const result = packageEvent('breakthrough_fail', { realmName: '金丹期' });
    expect(result.systemMessage).toContain('金丹期');
    expect(result.toastText).toBeTruthy();
    expect(result.icon).toBe('alert-triangle');
  });

  it('returns loot explosion message for legendary drop', () => {
    const result = packageEvent('loot_explosion', { itemName: '混沌至宝', rarity: 'legendary' });
    expect(result.systemMessage).toContain('混沌至宝');
    expect(result.toastText).toContain('爆款诞生');
    expect(result.color).toBe('#e74c3c');
  });

  it('returns face slap message', () => {
    const result = packageEvent('face_slap', { enemyName: '看不起你的宗门天才' });
    expect(result.systemMessage).toContain('看不起你的宗门天才');
    expect(result.toastText).toContain('就这');
  });

  it('handles unknown event type gracefully', () => {
    const result = packageEvent('unknown_event' as never, {});
    expect(result.systemMessage).toBeTruthy();
    expect(result.toastText).toBeTruthy();
  });

  it('ALL_EVENT_TYPES covers all supported types', () => {
    expect(ALL_EVENT_TYPES.length).toBeGreaterThanOrEqual(8);
    expect(ALL_EVENT_TYPES).toContain('kill_enemy');
    expect(ALL_EVENT_TYPES).toContain('breakthrough_success');
    expect(ALL_EVENT_TYPES).toContain('loot_explosion');
  });
});
