import type { MemoryState, MemoryCompressionResult, ShortTermMemory } from './types';

const MAX_SHORT_TERM = 8;
const SUMMARY_MAX_LENGTH = 300;

export function createMemoryState(): MemoryState {
  return {
    shortTerm: [],
    longTermSummary: '',
    importantFlags: [],
  };
}

export function addEvent(memory: MemoryState, round: number, event: string): MemoryState {
  const shortTerm = [...memory.shortTerm, { round, event }];
  return { ...memory, shortTerm };
}

export function needsCompression(memory: MemoryState): boolean {
  return memory.shortTerm.length >= MAX_SHORT_TERM;
}

export function addImportantFlag(memory: MemoryState, flag: string): MemoryState {
  if (memory.importantFlags.includes(flag)) return memory;
  return { ...memory, importantFlags: [...memory.importantFlags, flag] };
}

export function hasFlag(memory: MemoryState, flag: string): boolean {
  return memory.importantFlags.includes(flag);
}

const DEATH_KEYWORDS = ['死亡', '牺牲', '陨落', '死去', '毙命', '阵亡', '被杀', '处决', '毒杀'];
const RELATIONSHIP_KEYWORDS = ['好感', '合作', '背叛', '结盟', '加入', '离开', '表白', '求婚', '决裂'];
const PLOT_KEYWORDS = ['伏笔', '秘密', '真相', '预言', '宿命', '诅咒', '封印', '觉醒', '突破'];
const ARTIFACT_OBTAIN_KEYWORDS = ['获得传说', '获得道具', '获得奇物', '签到奖励', '隐藏奖励', '系统颁发'];
const ARTIFACT_USE_KEYWORDS = ['催熟', '空间跳跃', '轮盘转动', '预知未来', '灵液', '破界', '改写事件'];
const ARTIFACT_UPGRADE_KEYWORDS = ['升级', '进化', '突破', '觉醒道具', '淬炼', '蜕变'];

function extractFlags(events: ShortTermMemory[]): string[] {
  const flags: string[] = [];

  for (const e of events) {
    for (const kw of DEATH_KEYWORDS) {
      if (e.event.includes(kw)) {
        const npcMatch = e.event.match(/[「【](.+?)[」】]/g);
        if (npcMatch) {
          for (const m of npcMatch) {
            const name = m.replace(/[「【」】]/g, '');
            flags.push(`NPC_${name}_死亡`);
          }
        }
      }
    }
    for (const kw of RELATIONSHIP_KEYWORDS) {
      if (e.event.includes(kw)) {
        flags.push(`关系_${kw}_R${e.round}`);
      }
    }
    for (const kw of PLOT_KEYWORDS) {
      if (e.event.includes(kw)) {
        flags.push(`伏笔_${kw}_R${e.round}`);
      }
    }
    for (const kw of ARTIFACT_OBTAIN_KEYWORDS) {
      if (e.event.includes(kw)) {
        const nameMatch = e.event.match(/[「【『](.+?)[」】』]/g);
        if (nameMatch) {
          for (const m of nameMatch) {
            const name = m.replace(/[「【『」】』]/g, '');
            flags.push(`获得传说级道具「${name}」`);
          }
        }
      }
    }
    for (const kw of ARTIFACT_USE_KEYWORDS) {
      if (e.event.includes(kw)) {
        flags.push(`道具使用_${kw}`);
      }
    }
    for (const kw of ARTIFACT_UPGRADE_KEYWORDS) {
      if (e.event.includes(kw)) {
        const nameMatch = e.event.match(/[「【『](.+?)[」】』]/g);
        if (nameMatch) {
          for (const m of nameMatch) {
            const name = m.replace(/[「【『」】』]/g, '');
            flags.push(`道具升级_${name}`);
          }
        }
      }
    }
  }

  return [...new Set(flags)].slice(0, 15);
}

export function compressMemory(
  memory: MemoryState,
): MemoryCompressionResult {
  const events = memory.shortTerm;

  if (events.length <= 4) {
    return { summaryDelta: '', updatedFlags: [] };
  }

  const keepCount = 2;
  const toCompress = events.slice(0, events.length - keepCount);
  const kept = events.slice(-keepCount);

  const descriptions = toCompress.map((e) => e.event);
  const summaryDelta = buildSummary(descriptions);
  const updatedFlags = extractFlags(toCompress);

  return { summaryDelta, updatedFlags };
}

function buildSummary(events: string[]): string {
  if (events.length <= 1) {
    return events[0]?.slice(0, 80) || '';
  }

  const first = events[0].slice(0, 60).trim();
  const last = events[events.length - 1].slice(0, 60).trim();

  return `${first}...（历经${events.length}件事）...最终${last}。`;
}

export function applyCompression(
  memory: MemoryState,
  result: MemoryCompressionResult,
): MemoryState {
  const keepCount = 2;
  const kept = memory.shortTerm.slice(-keepCount);

  const newSummary = memory.longTermSummary
    ? `${memory.longTermSummary} ${result.summaryDelta}`.slice(0, SUMMARY_MAX_LENGTH)
    : result.summaryDelta.slice(0, SUMMARY_MAX_LENGTH);

  const newFlags = [...new Set([...memory.importantFlags, ...result.updatedFlags])];

  return {
    shortTerm: kept,
    longTermSummary: newSummary,
    importantFlags: newFlags,
  };
}
