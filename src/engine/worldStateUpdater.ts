import type { Player, WorldState } from '../types';

// ============================================================
// 时间线推进
// ============================================================

const TIMELINE_CYCLE = ['清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜', '黎明'];

/**
 * 推进时间线到下一个时段
 */
export function advanceTimeline(current: string): string {
  const match = current.match(/第(\d+)天·(.+)/);
  if (!match) return '第一天·清晨';

  const [, dayStr, phase] = match;
  const day = parseInt(dayStr, 10);
  const phaseIndex = TIMELINE_CYCLE.indexOf(phase);

  if (phaseIndex === -1) return `第${day}天·清晨`;

  const nextPhaseIndex = (phaseIndex + 1) % TIMELINE_CYCLE.length;
  const nextDay = nextPhaseIndex === 0 ? day + 1 : day;
  const nextPhase = TIMELINE_CYCLE[nextPhaseIndex];

  return `第${nextDay}天·${nextPhase}`;
}

// ============================================================
// 地点更新
// ============================================================

/**
 * 更新当前地点
 * 校验在 hallucinationGuard 中处理
 */
export function updateLocation(
  currentLocation: string,
  locationChange: string | undefined
): string {
  if (!locationChange) return currentLocation;
  return locationChange;
}

// ============================================================
// 全局标记
// ============================================================

/** 引擎自动设置的标记条件 */
const ENGINE_FLAG_CONDITIONS: Array<{
  flag: string;
  check: (player: Player) => boolean;
}> = [
  { flag: 'first_system_activation', check: (p) => p.progress.round >= 1 && p.system.level >= 1 },
  { flag: 'first_death', check: (p) => p.stats.hp <= 0 },
  { flag: 'first_combat_victory', check: (p) => p.progress.round > 1 }, // 简化判断
  { flag: 'first_level_up', check: (p) => p.stats.level > 1 },
  { flag: 'first_npc_encounter', check: (p) => p.npcs.length > 0 },
];

/**
 * 检查并设置引擎自动标记
 * @returns 新增的标记列表
 */
export function checkEngineFlags(player: Player): string[] {
  const newFlags: string[] = [];

  for (const { flag, check } of ENGINE_FLAG_CONDITIONS) {
    if (!player.worldState.globalFlags[flag] && check(player)) {
      newFlags.push(flag);
    }
  }

  return newFlags;
}

// ============================================================
// 世界状态更新（每回合调用）
// ============================================================

/**
 * 执行一回合的世界状态更新
 * @returns 更新后的 WorldState 和新增的引擎标记
 */
export function updateWorldStateForTurn(
  player: Player,
  locationChange?: string
): { worldState: WorldState; newFlags: string[] } {
  const worldState = { ...player.worldState };

  // 1. 推进时间线
  worldState.timeline = advanceTimeline(worldState.timeline);

  // 2. 更新地点
  if (locationChange) {
    worldState.currentLocation = locationChange;
  }

  // 3. 检查引擎自动标记
  const tempPlayer = { ...player, worldState };
  const newFlags = checkEngineFlags(tempPlayer);
  for (const flag of newFlags) {
    worldState.globalFlags = { ...worldState.globalFlags, [flag]: true };
  }

  return { worldState, newFlags };
}

// ============================================================
// Flag 描述映射
// ============================================================

export const FLAG_DESCRIPTIONS: Record<string, string> = {
  first_system_activation: '系统已经激活，宿主开始获得系统能力',
  first_death: '宿主曾经濒死，可能对生死有新的感悟',
  first_combat_victory: '宿主经历了首次战斗胜利',
  first_level_up: '宿主完成了首次等级突破',
  first_npc_encounter: '宿主邂逅了第一个重要NPC',
};

/**
 * 将全局标记转化为剧情上下文文本
 */
export function buildFlagContext(flags: Record<string, boolean>): string {
  const activeFlags = Object.entries(flags).filter(([, v]) => v);
  if (activeFlags.length === 0) return '';

  return (
    `[已发生的关键事件]\n` +
    activeFlags.map(([k]) => `- ${FLAG_DESCRIPTIONS[k] || k}`).join('\n')
  );
}
