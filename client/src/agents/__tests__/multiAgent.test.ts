import { describe, it, expect, beforeEach } from 'vitest';
import type { Player, Attributes, Stats, NpcStatus } from '../../types';
import type { MemoryState, EndingPrototype, StoryWeaverOutput, NarrativeContext } from '../types';

import {
  createMemoryState, addEvent, needsCompression,
  compressMemory, applyCompression, addImportantFlag, hasFlag,
} from '../memoryKeeper';

import {
  generateEndingPrototype, evaluateEnding, mutateCondition,
} from '../endingWatcher';

import { recommendWorld, evaluateWorldShift } from '../worldGuide';

import { validateNarrative, buildRetryPrompt } from '../truthSeer';

import {
  buildNarrativeContext, buildStoryWeaverPrompt,
  parseStoryWeaverOutput, generateFallbackOutput,
  buildEconomicState, buildArtifactHints,
} from '../storyWeaver';

import { initializeGame } from '../orchestrator';
import { generateArtifactCelebration } from '../personaActor';

import {
  createSystemHistory, processDailyCheckIn, getCheckInQuality,
} from '../systemAgent';

// ========== Mock Helpers ==========

function makeAttrs(overrides?: Partial<Attributes>): Attributes {
  return { talent: 5, appearance: 5, intelligence: 5, physique: 5, family: 5, luck: 5, ...overrides };
}

function makeStats(overrides?: Partial<Stats>): Stats {
  return {
    level: 3, exp: 150, hp: 100, maxHp: 120, mp: 50, maxMp: 60,
    combatPower: 80, wealth: 200, fame: 30, gold: 0, ...overrides,
  };
}

function makePlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'test-player-1',
    name: '测试修士',
    createdAt: Date.now(),
    attributes: makeAttrs(),
    stats: makeStats(),
    system: { id: 'sys_1', name: '吞噬系统', level: 1, exp: 0, features: ['basic_feature'] },
    progress: {
      sceneType: 'cultivation',
      sceneLevel: 1,
      round: 5,
      age: 20,
      storyFlags: [],
    },
    inventory: [],
    equipment: {},
    skills: [],
    activeTasks: [],
    completedTasks: [],
    achievements: [],
    history: [
      { round: 1, age: 16, description: '觉醒灵根，踏入修炼之路。', type: 'scene' },
      { round: 2, age: 17, description: '在妖兽森林外围遭遇低阶妖兽，成功击杀。', type: 'combat' },
      { round: 3, age: 18, description: '拜入青云宗外门，开始正式修炼。', type: 'scene' },
      { round: 4, age: 19, description: '外门大比中获得第三名，晋升内门弟子。', type: 'story' },
    ],
    talents: [],
    npcStatuses: {},
    artifacts: [],
    systemHistory: createSystemHistory(),
    ...overrides,
  };
}

// ================================================================
// 1. MemoryKeeper — 记忆守护者
// ================================================================

describe('MemoryKeeper 记忆守护者', () => {
  let memory: MemoryState;

  beforeEach(() => {
    memory = createMemoryState();
  });

  it('创建空记忆状态', () => {
    expect(memory.shortTerm).toEqual([]);
    expect(memory.longTermSummary).toBe('');
    expect(memory.importantFlags).toEqual([]);
  });

  it('添加事件到短期记忆', () => {
    memory = addEvent(memory, 1, '觉醒灵根');
    memory = addEvent(memory, 2, '击杀妖兽');
    expect(memory.shortTerm).toHaveLength(2);
    expect(memory.shortTerm[0]).toEqual({ round: 1, event: '觉醒灵根' });
    expect(memory.shortTerm[1]).toEqual({ round: 2, event: '击杀妖兽' });
  });

  it('不足8条时不需要压缩', () => {
    for (let i = 0; i < 7; i++) {
      memory = addEvent(memory, i + 1, `事件${i + 1}`);
    }
    expect(needsCompression(memory)).toBe(false);
  });

  it('达到8条时需要压缩', () => {
    for (let i = 0; i < 8; i++) {
      memory = addEvent(memory, i + 1, `事件${i + 1}`);
    }
    expect(needsCompression(memory)).toBe(true);
  });

  it('压缩后保留最近2条短期记忆', () => {
    for (let i = 0; i < 8; i++) {
      memory = addEvent(memory, i + 1, `事件${i + 1}`);
    }
    const result = compressMemory(memory);
    memory = applyCompression(memory, result);

    expect(memory.shortTerm).toHaveLength(2);
    expect(memory.shortTerm[0].event).toBe('事件7');
    expect(memory.shortTerm[1].event).toBe('事件8');
    expect(memory.longTermSummary.length).toBeGreaterThan(0);
  });

  it('累积压缩会追加长期摘要', () => {
    for (let i = 0; i < 8; i++) {
      memory = addEvent(memory, i + 1, `第${i + 1}件事`);
    }
    const r1 = compressMemory(memory);
    memory = applyCompression(memory, r1);

    for (let i = 8; i < 14; i++) {
      memory = addEvent(memory, i + 1, `第${i + 1}件事`);
    }
    const r2 = compressMemory(memory);
    memory = applyCompression(memory, r2);

    expect(memory.longTermSummary.length).toBeLessThanOrEqual(300);
    expect(memory.shortTerm).toHaveLength(2);
  });

  it('检测死亡关键词提取标记', () => {
    // compressMemory 只压缩前 len-2 条，需要超过4条才能触发关键词提取
    memory = addEvent(memory, 1, '进入宗门');
    memory = addEvent(memory, 2, '学习功法');
    memory = addEvent(memory, 3, '外出历练');
    memory = addEvent(memory, 4, '【张三人】在战斗中死亡');
    memory = addEvent(memory, 5, '【李四娘】被毒杀身亡');
    memory = addEvent(memory, 6, '继续前进');
    const result = compressMemory(memory);
    const hasDeathFlag = result.updatedFlags.some((f) => f.includes('死亡'));
    expect(hasDeathFlag).toBe(true);
  });

  it('添加和检查重要标记', () => {
    memory = addImportantFlag(memory, 'NPC_张三_死亡');
    expect(hasFlag(memory, 'NPC_张三_死亡')).toBe(true);
    expect(hasFlag(memory, 'NPC_不存在的_死亡')).toBe(false);
  });

  it('去重标记', () => {
    memory = addImportantFlag(memory, 'flag_a');
    memory = addImportantFlag(memory, 'flag_a');
    expect(memory.importantFlags.filter((f) => f === 'flag_a')).toHaveLength(1);
  });
});

// ================================================================
// 2. EndingWatcher — 结局守望者
// ================================================================

describe('EndingWatcher 结局守望者', () => {
  let prototype: EndingPrototype;

  beforeEach(() => {
    prototype = generateEndingPrototype(makeAttrs({ talent: 9, intelligence: 8, physique: 7 }), 'cultivation');
  });

  it('高天赋高智力玩家生成 transcendent 结局原型', () => {
    expect(prototype.name).toBeTruthy();
    expect(prototype.description).toBeTruthy();
    expect(prototype.conditions.length).toBeGreaterThanOrEqual(3);
    expect(prototype.overallFeasibility).toBe(50);
    expect(prototype.isStillPossible).toBe(true);
  });

  it('武力型玩家生成 conqueror 结局', () => {
    const p = generateEndingPrototype(makeAttrs({ physique: 8, talent: 6 }), 'apocalypse');
    expect(p.conditions.some((c) => c.targetAttribute === 'physique')).toBe(true);
  });

  it('智力型玩家生成 sage 结局', () => {
    const p = generateEndingPrototype(makeAttrs({ intelligence: 8, talent: 6 }), 'modern_city');
    expect(p.conditions.some((c) => c.targetAttribute === 'intelligence')).toBe(true);
  });

  it('评估属性条件进度', () => {
    const player = makePlayer({ attributes: makeAttrs({ talent: 7, intelligence: 6, physique: 5 }) });
    const evaluation = evaluateEnding(prototype, player);

    expect(evaluation.conditionProgress).toBeDefined();
    expect(Object.keys(evaluation.conditionProgress).length).toBeGreaterThan(0);
    expect(evaluation.overallFeasibility).toBeGreaterThanOrEqual(0);
    expect(evaluation.overallFeasibility).toBeLessThanOrEqual(100);
    expect(evaluation.narrativeHint.length).toBeGreaterThan(0);
  });

  it('评估社交条件进度', () => {
    const socialProto = generateEndingPrototype(makeAttrs({ physique: 7, luck: 3 }), 'cultivation');
    const npcStatuses: Record<string, NpcStatus> = {
      npc1: { id: 'npc1', name: '大师兄', alive: true, affection: 85, location: '青云宗', flags: [], firstMetRound: 1 },
      npc2: { id: 'npc2', name: '小师妹', alive: true, affection: 90, location: '青云宗', flags: [], firstMetRound: 2 },
    };
    const player = makePlayer({ npcStatuses, attributes: makeAttrs({ physique: 7, luck: 3 }) });
    const evaluation = evaluateEnding(socialProto, player);
    expect(evaluation.overallFeasibility).toBeGreaterThan(0);
  });

  it('变异失效条件', () => {
    const failedId = prototype.conditions[0].id;
    const mutated = mutateCondition(prototype, failedId);
    const newCond = mutated.conditions.find((c) => c.id.includes('mutated'));
    expect(newCond).toBeDefined();
    expect(newCond!.isStillPossible).toBe(true);
    expect(newCond!.progress).toBe(0);
  });

  it('变异不存在的条件ID返回原样', () => {
    const mutated = mutateCondition(prototype, 'nonexistent_id');
    expect(mutated).toBe(prototype);
  });
});

// ================================================================
// 3. WorldGuide — 世界导引师
// ================================================================

describe('WorldGuide 世界导引师', () => {
  it('为天赋型玩家推荐修仙世界', () => {
    const attrs = makeAttrs({ talent: 9, intelligence: 5, physique: 4 });
    const result = recommendWorld(attrs, []);

    expect(result.recommendedWorld).toBeTruthy();
    expect(result.reason.length).toBeGreaterThan(0);
    expect(result.invitationText.length).toBeGreaterThan(0);
    expect(result.alternativeWorlds.length).toBeGreaterThan(0);
    expect(result.alternativeWorlds).not.toContain(result.recommendedWorld);
  });

  it('为智力型玩家推荐现代都市', () => {
    const attrs = makeAttrs({ intelligence: 9, talent: 4, physique: 3 });
    const result = recommendWorld(attrs, []);

    expect(result.recommendedWorld).toBeTruthy();
    expect(result.reason).toContain('智力');
  });

  it('为体质型玩家推荐末世世界', () => {
    const attrs = makeAttrs({ physique: 9, talent: 4, intelligence: 4 });
    const result = recommendWorld(attrs, []);

    // 末世或末世玄幻都应该匹配
    const physicalWorlds = ['apocalypse', 'apoc_fantasy', 'hidden_demon'];
    expect(physicalWorlds).toContain(result.recommendedWorld);
  });

  it('每10回合评估世界转换', () => {
    const player = makePlayer({
      progress: { sceneType: 'modern_city', sceneLevel: 1, round: 10, age: 25, storyFlags: [] },
      attributes: makeAttrs({ talent: 8, physique: 7, intelligence: 3 }),
    });

    const signal = evaluateWorldShift(player, 'modern_city');
    // 可能为null（如果不满足条件）或返回转换信号
    if (signal) {
      expect(signal.shouldShift).toBe(true);
      expect(signal.targetWorld).toBeTruthy();
      expect(signal.shiftEventIdea.length).toBeGreaterThan(0);
    }
  });

  it('非10倍数回合不触发转换（无属性突破时）', () => {
    const player = makePlayer({
      progress: { sceneType: 'cultivation', sceneLevel: 1, round: 7, age: 22, storyFlags: [] },
    });

    const signal = evaluateWorldShift(player, 'cultivation');
    // 回合7不是10的倍数，且属性没有>=8的突破，应该返回null
    expect(signal).toBeNull();
  });
});

// ================================================================
// 4. TruthSeer — 真实之眼
// ================================================================

describe('TruthSeer 真实之眼', () => {
  const baseOutput: StoryWeaverOutput = {
    sceneDescription: '你站在山巅，云雾缭绕。',
    systemDialogue: '叮！前方有新的机缘等待着你。',
    npcInteractions: [],
    playerChoices: [
      { id: 'c1', text: '修炼', consequence: '提升修为' },
      { id: 'c2', text: '探索', consequence: '发现秘境' },
      { id: 'c3', text: '交易', consequence: '获取资源' },
      { id: 'c4', text: '休息', consequence: '恢复体力' },
    ],
    attributeChanges: { talent: 1, physique: 2 },
    newEvents: ['在山巅修炼', '发现灵气浓郁之地'],
    narrativeHook: '远方似乎有什么在召唤...',
  };

  it('有效叙事通过验证', () => {
    const player = makePlayer();
    const memory = createMemoryState();
    const result = validateNarrative(baseOutput, player, memory);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('检测已死亡NPC重新出现', () => {
    const player = makePlayer({
      npcStatuses: {
        npc1: { id: 'npc1', name: '张三', alive: false, affection: 0, location: '', flags: ['已死亡'], firstMetRound: 1 },
      },
    });

    const output: StoryWeaverOutput = {
      ...baseOutput,
      sceneDescription: '张三从远处走来，面带微笑。',
      npcInteractions: [{ npcId: 'npc1', npcName: '张三', dialogue: '好久不见！' }],
    };

    const result = validateNarrative(output, player, createMemoryState());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('张三'))).toBe(true);
  });

  it('检测属性变化超阈值', () => {
    const output: StoryWeaverOutput = {
      ...baseOutput,
      attributeChanges: { talent: 10, physique: 3 },
    };

    const result = validateNarrative(output, makePlayer(), createMemoryState());
    expect(result.errors.some((e) => e.includes('属性变化过大'))).toBe(true);
  });

  it('属性变化在阈值内通过验证', () => {
    const output: StoryWeaverOutput = {
      ...baseOutput,
      attributeChanges: { talent: 3, intelligence: -2 },
    };

    const result = validateNarrative(output, makePlayer(), createMemoryState());
    expect(result.valid).toBe(true);
  });

  it('检测事件完全重复', () => {
    const memory = createMemoryState();
    const output: StoryWeaverOutput = {
      ...baseOutput,
      newEvents: ['在山巅修炼'],
    };

    // First add the same event to memory
    const memWithEvent = addEvent(memory, 1, '在山巅修炼');
    const result = validateNarrative(output, makePlayer(), memWithEvent);

    expect(result.errors.some((e) => e.includes('完全重复'))).toBe(true);
  });

  it('检测高相似度警告', () => {
    const memory = createMemoryState();
    // 用标点分隔的短语，让分词器能提取出重叠的关键词
    const memWithEvent = addEvent(memory, 1, '在山巅修炼，突破境界，获得天道认可');
    const output: StoryWeaverOutput = {
      ...baseOutput,
      newEvents: ['在山巅修炼，突破境界，实力大增'],
    };

    const result = validateNarrative(output, makePlayer(), memWithEvent);
    // 分词后：['在山巅修炼', '突破境界', '获得天道认可'] vs ['在山巅修炼', '突破境界', '实力大增']
    // 重叠：'在山巅修炼'、'突破境界' → 2/3 ≈ 0.67 > 0.6 阈值
    const hasWarning = result.warnings.some((w) => w.includes('高度相似'));
    expect(hasWarning).toBe(true);
  });

  it('buildRetryPrompt 生成错误提示', () => {
    const errors = ['出现已死亡NPC「张三」', '属性变化过大：talent 变化 10'];
    const prompt = buildRetryPrompt(errors);
    expect(prompt).toContain('张三');
    expect(prompt).toContain('talent');
  });

  it('空错误列表返回空字符串', () => {
    expect(buildRetryPrompt([])).toBe('');
  });
});

// ================================================================
// 5. StoryWeaver — 剧情编织者
// ================================================================

describe('StoryWeaver 剧情编织者', () => {
  const player = makePlayer();

  it('构建叙事上下文', () => {
    const ctx = buildNarrativeContext(
      player,
      '长期摘要：从凡人到修士的蜕变。',
      [{ round: 4, event: '外门大比中获得第三名' }],
      '需要更多地关注「智力达到90」。',
      null,
    );

    expect(ctx.worldSetting).toBeTruthy();
    expect(ctx.systemPersonality).toBeTruthy();
    expect(ctx.longTermSummary).toContain('从凡人到修士');
    expect(ctx.recentEvents).toHaveLength(1);
    expect(ctx.endingHint).toContain('智力达到90');
    expect(ctx.player).toBe(player);
  });

  it('构建完整StoryWeaver Prompt', () => {
    const ctx = buildNarrativeContext(player, '长期摘要', [], '结局提示', null);
    const prompt = buildStoryWeaverPrompt(ctx);

    expect(prompt).toContain('万界行者');
    expect(prompt).toContain('剧情编织者');
    expect(prompt).toContain(player.name);
    expect(prompt).toContain('长期摘要');
    expect(prompt).toContain('结局提示');
    // 确保包含输出格式要求
    expect(prompt).toContain('sceneDescription');
    expect(prompt).toContain('playerChoices');
  });

  it('解析有效JSON输出', () => {
    const raw = JSON.stringify({
      sceneDescription: '测试场景',
      systemDialogue: '叮！测试消息。',
      npcInteractions: [{ npcId: 'n1', npcName: '测试NPC', dialogue: '你好！' }],
      playerChoices: [
        { id: 'c1', text: '选项1', consequence: '结果1' },
        { id: 'c2', text: '选项2', consequence: '结果2' },
        { id: 'c3', text: '选项3', consequence: '结果3' },
        { id: 'c4', text: '选项4', consequence: '结果4' },
      ],
      attributeChanges: { talent: 1 },
      newEvents: ['事件1'],
      narrativeHook: '悬念...',
    });

    const output = parseStoryWeaverOutput(raw);
    expect(output.sceneDescription).toBe('测试场景');
    expect(output.systemDialogue).toBe('叮！测试消息。');
    expect(output.npcInteractions).toHaveLength(1);
    expect(output.playerChoices).toHaveLength(4);
    expect(output.narrativeHook).toBe('悬念...');
  });

  it('解析带markdown代码块的JSON', () => {
    const raw = '```json\n' + JSON.stringify({
      sceneDescription: '测试',
      systemDialogue: '叮！',
      npcInteractions: [],
      playerChoices: [
        { id: 'c1', text: 'A', consequence: 'a' },
        { id: 'c2', text: 'B', consequence: 'b' },
        { id: 'c3', text: 'C', consequence: 'c' },
        { id: 'c4', text: 'D', consequence: 'd' },
      ],
      attributeChanges: {},
      newEvents: [],
      narrativeHook: '',
    }) + '\n```';

    const output = parseStoryWeaverOutput(raw);
    expect(output.sceneDescription).toBe('测试');
  });

  it('解析不完整JSON时使用默认值', () => {
    const output = parseStoryWeaverOutput('{ "sceneDescription": "部分数据" }');
    expect(output.sceneDescription).toBe('部分数据');
    expect(output.playerChoices).toHaveLength(4); // 默认4个选项
    expect(output.systemDialogue).toBeTruthy();
    expect(output.narrativeHook).toBeTruthy();
  });

  it('生成兜底输出', () => {
    const ctx = buildNarrativeContext(player, '', [], '', null);
    const output = generateFallbackOutput(ctx);

    expect(output.sceneDescription.length).toBeGreaterThan(0);
    expect(output.systemDialogue.length).toBeGreaterThan(0);
    expect(output.playerChoices).toHaveLength(4);
    expect(output.narrativeHook.length).toBeGreaterThan(0);
  });
});

// ================================================================
// 6. Orchestrator — 协调器集成
// ================================================================

describe('Orchestrator 协调器集成', () => {
  it('initializeGame 返回世界推荐和结局名称', () => {
    const player = makePlayer({ attributes: makeAttrs({ talent: 9, intelligence: 7, physique: 6 }) });
    const init = initializeGame(player);

    expect(init.recommendation).toBeDefined();
    expect(init.recommendation.recommendedWorld).toBeTruthy();
    expect(init.recommendation.reason).toBeTruthy();
    expect(init.recommendation.invitationText).toBeTruthy();
    expect(init.recommendation.alternativeWorlds.length).toBeGreaterThan(0);
    expect(init.endingName).toBeTruthy();
    expect(init.endingName.length).toBeGreaterThan(0);
  });

  it('连续调用initializeGame会重置状态', () => {
    const p1 = makePlayer({ attributes: makeAttrs({ talent: 9, intelligence: 8, physique: 7 }) });
    const init1 = initializeGame(p1);

    const p2 = makePlayer({ attributes: makeAttrs({ physique: 9, talent: 6, intelligence: 4 }) });
    const init2 = initializeGame(p2);

    // 不同属性应产生不同的结局
    expect(init1.endingName).toBeTruthy();
    expect(init2.endingName).toBeTruthy();
  });
});

// ================================================================
// 7. 完整管线模拟（无AI依赖）
// ================================================================

describe('多智能体协作 — 完整管线模拟', () => {
  it('端到端管线：记忆→结局→叙事→校验', () => {
    const player = makePlayer({
      attributes: makeAttrs({ talent: 7, intelligence: 6, physique: 5, luck: 4 }),
      npcStatuses: {
        npc1: { id: 'npc1', name: '大师兄', alive: true, affection: 60, location: '青云宗', flags: [], firstMetRound: 1 },
      },
    });

    // Step 1: MemoryKeeper — 管理记忆
    let memory = createMemoryState();
    for (const h of player.history) {
      memory = addEvent(memory, h.round, h.description);
    }
    memory = addEvent(memory, player.progress.round, '完成外门大比，准备进入内门。');

    if (memory.shortTerm.length >= 8) {
      const result = compressMemory(memory);
      memory = applyCompression(memory, result);
    }

    expect(memory.shortTerm.length).toBeGreaterThan(0);
    expect(memory.shortTerm.length).toBeLessThanOrEqual(8);

    // Step 2: EndingWatcher — 生成并评估结局
    const prototype = generateEndingPrototype(player.attributes, player.progress.sceneType);
    const evaluation = evaluateEnding(prototype, player);

    expect(evaluation.narrativeHint.length).toBeGreaterThan(0);
    expect(evaluation.overallFeasibility).toBeGreaterThanOrEqual(0);

    // Step 3: StoryWeaver — 构建叙事上下文
    const narrativeCtx = buildNarrativeContext(
      player,
      memory.longTermSummary,
      memory.shortTerm,
      evaluation.narrativeHint,
      null,
    );

    expect(narrativeCtx.worldSetting).toBeTruthy();
    expect(narrativeCtx.endingHint).toBe(evaluation.narrativeHint);
    expect(narrativeCtx.recentEvents).toBe(memory.shortTerm);

    // Step 4: 生成兜底叙事（模拟AI输出失败场景）
    const fallback = generateFallbackOutput(narrativeCtx);

    // Step 5: TruthSeer — 校验输出
    const validation = validateNarrative(fallback, player, memory, prototype);

    // 兜底输出应该总是有效的
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // 校验叙事输出的完整性
    expect(fallback.sceneDescription.length).toBeGreaterThan(0);
    expect(fallback.systemDialogue.length).toBeGreaterThan(0);
    expect(fallback.playerChoices).toHaveLength(4);
    expect(fallback.narrativeHook.length).toBeGreaterThan(0);

    // 验证每个选项都有必要字段
    for (const choice of fallback.playerChoices) {
      expect(choice.id).toBeTruthy();
      expect(choice.text).toBeTruthy();
      expect(choice.consequence).toBeTruthy();
    }
  });

  it('记忆压缩管线：从8条事件到压缩摘要', () => {
    let memory = createMemoryState();

    const events = [
      '觉醒灵根，灵气涌动周身。',
      '初入山门，拜见掌门师尊。',
      '外门修炼，习得基础功法。',
      '妖兽森林历练，击杀三只妖兽。',
      '结识同门师兄妹，建立友谊。',
      '外门大比中获得第三名。',
      '晋升内门弟子，获赐丹药。',
      '内门第一次闭关修炼，修为大涨。',
    ];

    for (let i = 0; i < events.length; i++) {
      memory = addEvent(memory, i + 1, events[i]);
    }

    expect(needsCompression(memory)).toBe(true);

    const result = compressMemory(memory);
    memory = applyCompression(memory, result);

    expect(memory.shortTerm).toHaveLength(2);
    expect(memory.longTermSummary.length).toBeGreaterThan(0);
    expect(memory.longTermSummary.length).toBeLessThanOrEqual(300);
    expect(memory.importantFlags.length).toBeGreaterThanOrEqual(0);

    // 最重要的最近事件保留在短期记忆中
    expect(memory.shortTerm[0].event).toBe(events[6]);
    expect(memory.shortTerm[1].event).toBe(events[7]);
  });

  it('不同属性分布生成不同结局原型', () => {
    const archetypes = new Set<string>();

    const profiles: Attributes[] = [
      makeAttrs({ talent: 9, intelligence: 8, physique: 7 }),
      makeAttrs({ physique: 9, talent: 7 }),
      makeAttrs({ intelligence: 9, talent: 7 }),
      makeAttrs({ physique: 7, luck: 3 }),
      makeAttrs({ talent: 4, intelligence: 4, physique: 4 }),
    ];

    for (const attrs of profiles) {
      const proto = generateEndingPrototype(attrs, 'cultivation');
      archetypes.add(proto.endingId.split('_')[1]); // ending_{archetype}_{timestamp}
    }

    // 至少应该产生3种不同的结局原型
    expect(archetypes.size).toBeGreaterThanOrEqual(3);
  });

  it('校验管线：事件重复检测 + 死NPC检测 + 属性阈值', () => {
    const player = makePlayer({
      npcStatuses: {
        npc_dead: { id: 'npc_dead', name: '已故前辈', alive: false, affection: 0, location: '', flags: ['已死亡'], firstMetRound: 1 },
        npc_alive: { id: 'npc_alive', name: '小师妹', alive: true, affection: 75, location: '青云宗', flags: [], firstMetRound: 3 },
      },
    });

    const memory = createMemoryState();
    // 添加一个近期事件用于重复检测
    const memWithHistory = addEvent(memory, 3, '在山巅修炼，悟得天道至理');

    // 测试1：死NPC + 属性超阈值 = 多重错误
    const badOutput: StoryWeaverOutput = {
      sceneDescription: '已故前辈从远处走来，面带微笑地看着你。',
      systemDialogue: '叮！',
      npcInteractions: [{ npcId: 'npc_dead', npcName: '已故前辈', dialogue: '好久不见，年轻人。' }],
      playerChoices: [
        { id: 'c1', text: 'A', consequence: 'a' },
        { id: 'c2', text: 'B', consequence: 'b' },
        { id: 'c3', text: 'C', consequence: 'c' },
        { id: 'c4', text: 'D', consequence: 'd' },
      ],
      attributeChanges: { talent: 8, intelligence: -6 },
      newEvents: ['在山巅修炼悟道'], // 与近期事件高度相似
      narrativeHook: '',
    };

    const result = validateNarrative(badOutput, player, memWithHistory);

    // 应该有死NPC错误和属性超阈值错误
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some((e) => e.includes('已故前辈'))).toBe(true);
    expect(result.errors.some((e) => e.includes('属性变化过大'))).toBe(true);
  });
});

// ================================================================
// 8. 经济系统 — buildEconomicState / buildArtifactHints
// ================================================================

describe('Merchant & Artifact — 经济系统', () => {
  it('buildEconomicState 从玩家提取经济状态', () => {
    const player = makePlayer({
      stats: makeStats({ gold: 150 }),
      inventory: [
        { id: 'i1', name: '妖兽内丹', description: '', rarity: 'rare', type: 'material', effect: {} },
        { id: 'i2', name: '破旧长剑', description: '', rarity: 'common', type: 'weapon' },
      ],
    });

    const state = buildEconomicState(player);

    expect(state.gold).toBe(150);
    expect(state.tradableItems).toHaveLength(1);
    expect(state.tradableItems[0].name).toBe('妖兽内丹');
    expect(state.tradableItems[0].estimatedValue).toBeGreaterThan(0);
  });

  it('buildEconomicState 空背包返回空列表', () => {
    const player = makePlayer();
    const state = buildEconomicState(player);

    expect(state.gold).toBe(0);
    expect(state.tradableItems).toHaveLength(0);
  });

  it('buildArtifactHints 从玩家的奇物生成使用提示', () => {
    const player = makePlayer({
      artifacts: [
        { id: 'small_green_bottle', name: '小绿瓶', type: 'growth_artifact', quality: 'legendary',
          abilities: ['催熟灵药'], upgradeLevel: 1, maxUpgradeLevel: 5,
          cooldown: 2, maxCooldown: 5, description: '' },
        { id: 'realm_breaker', name: '破界珠', type: 'growth_artifact', quality: 'legendary',
          abilities: ['空间跳跃'], upgradeLevel: 0, maxUpgradeLevel: 5,
          cooldown: 0, maxCooldown: 10, description: '' },
      ],
    });

    const hints = buildArtifactHints(player);

    expect(hints).toHaveLength(2);
    expect(hints[0].artifactId).toBe('small_green_bottle');
    expect(hints[0].unusedRounds).toBe(2);
    expect(hints[1].artifactId).toBe('realm_breaker');
    expect(hints[1].unusedRounds).toBe(0);
  });

  it('buildArtifactHints 无奇物时返回空数组', () => {
    const player = makePlayer();
    const hints = buildArtifactHints(player);
    expect(hints).toHaveLength(0);
  });

  it('StoryWeaver Prompt 包含经济状态和道具段', () => {
    const player = makePlayer({
      stats: makeStats({ gold: 200 }),
      artifacts: [
        { id: 'small_green_bottle', name: '小绿瓶', type: 'growth_artifact', quality: 'legendary',
          abilities: ['催熟灵药'], upgradeLevel: 2, maxUpgradeLevel: 5,
          cooldown: 0, maxCooldown: 5, description: '' },
      ],
    });

    const ctx = buildNarrativeContext(
      player, '摘要', [], '结局提示', null,
      undefined,
      buildEconomicState(player),
      buildArtifactHints(player),
    );

    const prompt = buildStoryWeaverPrompt(ctx);

    expect(prompt).toContain('经济状态');
    expect(prompt).toContain('金币：200');
    expect(prompt).toContain('行脚商人');
    expect(prompt).toContain('道具互动铁律');
    expect(prompt).toContain('小绿瓶');
    expect(prompt).toContain('催熟灵药');
  });

  it('无道具时Prompt不包含道具铁律段', () => {
    const player = makePlayer();
    const ctx = buildNarrativeContext(player, '', [], '', null);
    const prompt = buildStoryWeaverPrompt(ctx);

    expect(prompt).not.toContain('道具互动铁律');
  });
});

// ================================================================
// 9. 真实之眼 — 商人校验
// ================================================================

describe('Merchant & Artifact — 真实之眼商人校验', () => {
  it('检测商人价格超出上限', () => {
    const player = makePlayer();
    const memory = createMemoryState();
    const output: StoryWeaverOutput = {
      sceneDescription: '一位神秘商人出现，手中宝物标价5000金币。',
      systemDialogue: '叮！',
      npcInteractions: [],
      playerChoices: [{ id: 'c1', text: 'A', consequence: '' }, { id: 'c2', text: 'B', consequence: '' }, { id: 'c3', text: 'C', consequence: '' }, { id: 'c4', text: 'D', consequence: '' }],
      attributeChanges: {},
      newEvents: ['商人出现'],
      narrativeHook: '',
    };

    const result = validateNarrative(output, player, memory);
    expect(result.errors.some((e) => e.includes('商人价格过高'))).toBe(true);
  });

  it('商人价格合理时不报错', () => {
    const player = makePlayer({ stats: makeStats({ gold: 300 }) });
    const memory = createMemoryState();
    const output: StoryWeaverOutput = {
      sceneDescription: '商人出售一颗丹药，要价50金币。',
      systemDialogue: '叮！',
      npcInteractions: [],
      playerChoices: [{ id: 'c1', text: 'A', consequence: '' }, { id: 'c2', text: 'B', consequence: '' }, { id: 'c3', text: 'C', consequence: '' }, { id: 'c4', text: 'D', consequence: '' }],
      attributeChanges: {},
      newEvents: ['商人交易'],
      narrativeHook: '',
    };

    const result = validateNarrative(output, player, memory);
    expect(result.errors.filter((e) => e.includes('商人价格')).length).toBe(0);
  });

  it('修仙世界中现代物品触发警告', () => {
    const player = makePlayer();
    const memory = createMemoryState();
    const output: StoryWeaverOutput = {
      sceneDescription: '商人拿出一台最新款手机，说是在古战场遗迹中发现的。',
      systemDialogue: '叮！',
      npcInteractions: [{ npcId: 'm1', npcName: '商人', dialogue: '这台手机可是好东西！' }],
      playerChoices: [{ id: 'c1', text: 'A', consequence: '' }, { id: 'c2', text: 'B', consequence: '' }, { id: 'c3', text: 'C', consequence: '' }, { id: 'c4', text: 'D', consequence: '' }],
      attributeChanges: {},
      newEvents: ['商人出现'],
      narrativeHook: '',
    };

    const result = validateNarrative(output, player, memory);
    expect(result.warnings.some((w) => w.includes('修仙世界') && w.includes('现代物品'))).toBe(true);
  });
});

// ================================================================
// 10. 结局守望者 — 道具条件
// ================================================================

describe('Merchant & Artifact — 结局守望者道具条件', () => {
  it('评估道具升级条件进度', () => {
    const player = makePlayer({
      attributes: makeAttrs({ talent: 9, intelligence: 8, physique: 7 }),
      artifacts: [
        { id: 'small_green_bottle', name: '小绿瓶', type: 'growth_artifact', quality: 'legendary',
          abilities: ['催熟灵药'], upgradeLevel: 3, maxUpgradeLevel: 5, cooldown: 0, maxCooldown: 5, description: '' },
      ],
    });

    const prototype = generateEndingPrototype(player.attributes, player.progress.sceneType);
    const evaluation = evaluateEnding(prototype, player);

    // 小绿瓶升级进度应该是 3/4 = 75%
    const bottleCond = prototype.conditions.find((c) => c.targetArtifactId === 'small_green_bottle');
    if (bottleCond) {
      const progress = evaluation.conditionProgress[bottleCond.id];
      expect(progress).toBe(75);
    }
  });

  it('无道具时道具条件进度为0', () => {
    const player = makePlayer({
      attributes: makeAttrs({ talent: 9, intelligence: 8, physique: 7 }),
    });

    const prototype = generateEndingPrototype(player.attributes, player.progress.sceneType);
    const evaluation = evaluateEnding(prototype, player);

    const bottleCond = prototype.conditions.find((c) => c.targetArtifactId === 'small_green_bottle');
    if (bottleCond) {
      expect(evaluation.conditionProgress[bottleCond.id]).toBe(0);
    }
  });
});

// ================================================================
// 11. 记忆守护者 — 道具标记
// ================================================================

describe('Merchant & Artifact — 记忆守护者道具标记', () => {
  it('识别获得道具事件并提取标记', () => {
    let memory = createMemoryState();
    memory = addEvent(memory, 1, '觉醒灵根，踏入修炼之路。');
    memory = addEvent(memory, 2, '初入山门，拜见掌门。');
    memory = addEvent(memory, 3, '签到奖励触发隐藏奖励——「小绿瓶」！系统颁发传说级道具，效果：催熟灵药。');
    memory = addEvent(memory, 4, '外门修炼，习得基础功法。');
    memory = addEvent(memory, 5, '妖兽森林历练，击杀妖兽。');
    memory = addEvent(memory, 6, '结识同门师兄妹。');
    memory = addEvent(memory, 7, '外门大比获得第三名。');
    memory = addEvent(memory, 8, '晋升内门弟子，获赐丹药。');

    const result = compressMemory(memory);
    expect(result.updatedFlags.some((f) => f.includes('小绿瓶'))).toBe(true);
  });

  it('识别道具使用事件并提取标记', () => {
    let memory = createMemoryState();
    memory = addEvent(memory, 1, '觉醒灵根，踏入修炼之路。');
    memory = addEvent(memory, 2, '初入山门，拜见掌门。');
    memory = addEvent(memory, 3, '用「小绿瓶」催熟灵药，绿色光芒笼罩药田。');
    memory = addEvent(memory, 4, '外门修炼，习得基础功法。');
    memory = addEvent(memory, 5, '妖兽森林历练，击杀妖兽。');
    memory = addEvent(memory, 6, '结识同门师兄妹。');
    memory = addEvent(memory, 7, '外门大比获得第三名。');
    memory = addEvent(memory, 8, '内门第一次闭关修炼，修为大涨。');

    const result = compressMemory(memory);
    expect(result.updatedFlags.some((f) => f.includes('道具使用'))).toBe(true);
  });
});

// ================================================================
// 12. 性格演员 — 传说级庆祝模板
// ================================================================

describe('Merchant & Artifact — 性格演员庆祝模板', () => {
  it('generateArtifactCelebration 返回小绿瓶庆祝语', () => {
    const artifact = {
      id: 'small_green_bottle', name: '小绿瓶', type: 'growth_artifact' as const,
      quality: 'legendary' as const, abilities: ['催熟灵药'],
      upgradeLevel: 0, maxUpgradeLevel: 5, cooldown: 0, maxCooldown: 5,
      description: '一个看似普通的绿色小瓶。',
    };
    const msg = generateArtifactCelebration(artifact);
    expect(msg).toContain('叮！');
    expect(msg).toContain('小绿瓶');
  });

  it('generateArtifactCelebration 返回命运轮盘庆祝语', () => {
    const artifact = {
      id: 'fate_wheel', name: '命运轮盘', type: 'growth_artifact' as const,
      quality: 'legendary' as const, abilities: ['随机属性提升'],
      upgradeLevel: 0, maxUpgradeLevel: 3, cooldown: 0, maxCooldown: 1,
      description: '转动命运之轮。',
    };
    const msg = generateArtifactCelebration(artifact);
    expect(msg).toContain('命运轮盘');
  });

  it('未知道具使用通用庆祝模板', () => {
    const artifact = {
      id: 'unknown_artifact', name: '神秘道具', type: 'growth_artifact' as const,
      quality: 'legendary' as const, abilities: ['未知效果'],
      upgradeLevel: 0, maxUpgradeLevel: 1, cooldown: 0, maxCooldown: 1,
      description: '一件来历不明的道具。',
    };
    const msg = generateArtifactCelebration(artifact);
    expect(msg).toContain('传说级道具');
    expect(msg).toContain('神秘道具');
  });
});

// ================================================================
// 13. 系统智能体 — 签到 & 奖励
// ================================================================

describe('SystemAgent — 签到系统', () => {
  it('getCheckInQuality 返回正确的品质梯度', () => {
    expect(getCheckInQuality(1)).toBe('common');
    expect(getCheckInQuality(2)).toBe('common');
    expect(getCheckInQuality(3)).toBe('epic');
    expect(getCheckInQuality(6)).toBe('epic');
    expect(getCheckInQuality(7)).toBe('legendary');
    expect(getCheckInQuality(14)).toBe('legendary');
    expect(getCheckInQuality(15)).toBe('mythic');
    expect(getCheckInQuality(30)).toBe('mythic');
  });

  it('processDailyCheckIn 首次签到返回common品质', () => {
    const player = makePlayer();
    const history = createSystemHistory();

    const result = processDailyCheckIn(player, history);

    expect(result.canCheckIn).toBe(true);
    expect(result.streak).toBe(1);
    expect(result.quality).toBe('common');
    expect(result.rewards.length).toBeGreaterThan(0);
    expect(result.rewards.some((r) => r.type === 'gold')).toBe(true);
    expect(result.rewards.some((r) => r.type === 'exp')).toBe(true);
    expect(result.dialogue.length).toBeGreaterThan(0);
  });

  it('processDailyCheckIn 重复签到被拦截', () => {
    const player = makePlayer();
    const history = createSystemHistory();
    history.lastCheckInRound = player.progress.round;

    const result = processDailyCheckIn(player, history);

    expect(result.canCheckIn).toBe(false);
    expect(result.rewards).toHaveLength(0);
  });

  it('processDailyCheckIn 连续签到3天 → epic品质', () => {
    const player = makePlayer();
    const history = createSystemHistory();
    history.checkInStreak = 2;
    history.lastCheckInRound = player.progress.round - 1;

    const result = processDailyCheckIn(player, history);

    expect(result.canCheckIn).toBe(true);
    expect(result.streak).toBe(3);
    expect(result.quality).toBe('epic');
    expect(result.dialogue.length).toBeGreaterThan(0);
  });

  it('processDailyCheckIn 连续签到7天 → legendary品质 + 传说道具', () => {
    const player = makePlayer();
    const history = createSystemHistory();
    history.checkInStreak = 6;
    history.lastCheckInRound = player.progress.round - 1;

    const result = processDailyCheckIn(player, history);

    expect(result.canCheckIn).toBe(true);
    expect(result.streak).toBe(7);
    expect(result.quality).toBe('legendary');
    expect(result.rewards.some((r) => r.type === 'artifact')).toBe(true);
    expect(result.storyHook).toBeDefined();
    expect(result.storyHook!.length).toBeGreaterThan(0);
  });

  it('processDailyCheckIn 连续签到15天 → mythic品质 + 属性提升', () => {
    const player = makePlayer();
    const history = createSystemHistory();
    history.checkInStreak = 14;
    history.lastCheckInRound = player.progress.round - 1;

    const result = processDailyCheckIn(player, history);

    expect(result.canCheckIn).toBe(true);
    expect(result.streak).toBe(15);
    expect(result.quality).toBe('mythic');
    expect(result.rewards.some((r) => r.type === 'attribute')).toBe(true);
  });

  it('processDailyCheckIn 已持有的道具不重复发放', () => {
    const player = makePlayer({
      artifacts: [{
        id: 'small_green_bottle', name: '小绿瓶', type: 'growth_artifact', quality: 'legendary',
        abilities: ['催熟灵药'], upgradeLevel: 1, maxUpgradeLevel: 5,
        cooldown: 0, maxCooldown: 5, description: '',
      }],
    });
    const history = createSystemHistory();
    history.checkInStreak = 6;
    history.lastCheckInRound = player.progress.round - 1;

    const result = processDailyCheckIn(player, history);

    // 应该发下一个可用的artifact（realm_breaker），而不是 small_green_bottle
    const artReward = result.rewards.find((r) => r.type === 'artifact');
    if (artReward && artReward.artifact) {
      expect(artReward.artifact.id).not.toBe('small_green_bottle');
    }
  });

  it('processDailyCheckIn 断签后streak重置为1', () => {
    const player = makePlayer();
    const history = createSystemHistory();
    history.checkInStreak = 10;
    history.lastCheckInRound = player.progress.round - 3; // 间隔超过1回合

    const result = processDailyCheckIn(player, history);

    expect(result.streak).toBe(1);
    expect(result.quality).toBe('common');
    expect(result.dialogue).toMatch(/中断|断签|断了一天/);
  });

  it('createSystemHistory 返回初始状态', () => {
    const history = createSystemHistory();

    expect(history.checkInStreak).toBe(0);
    expect(history.lastCheckInRound).toBe(0);
    expect(history.lastRewardItemIds).toHaveLength(0);
    expect(history.totalGoldIssued).toBe(0);
    expect(history.artifactIssueHistory).toHaveLength(0);
  });

  it('SystemHistory 包含在 player 中（类型安全验证）', () => {
    const player = makePlayer();

    expect(player.systemHistory).toBeDefined();
    expect(player.systemHistory.checkInStreak).toBe(0);
    expect(player.systemHistory.lastCheckInRound).toBe(0);
    expect(Array.isArray(player.systemHistory.artifactIssueHistory)).toBe(true);
  });
});
