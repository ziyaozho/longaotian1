import { create } from 'zustand';
import { getSystemPhase } from '../narrative';
import type { SystemDialogueLine, SystemPhase, StoryNode, StoryChoice } from '../narrative';

/**
 * ============================================================
 * 《万界行者》叙事状态管理
 * ============================================================
 *
 * 职责：
 * 1. 管理系统对话队列（SystemDialogue）
 * 2. 追踪主线剧情节点状态（StoryNode）
 * 3. 记录 storyFlags 与已完成的剧情节点
 * 4. 维护对话历史
 * 5. 提供叙事暂停/恢复控制
 */

// ------------------------------------------------------------------
// 类型定义
// ------------------------------------------------------------------

export interface DialogueEntry {
  /** 唯一标识 */
  id: string;
  /** 原始对话行数据 */
  line: SystemDialogueLine;
  /** 替换变量后的实际文本 */
  resolvedText: string;
  /** 触发时间戳 */
  timestamp: number;
  /** 是否已被玩家阅读 */
  read: boolean;
  /** 关联的系统类别 */
  category: string;
}

export interface StoryNodeState {
  /** 节点ID */
  nodeId: string;
  /** 节点原始数据 */
  node: StoryNode;
  /** 玩家做出的选择（如果有） */
  playerChoice?: StoryChoice;
  /** 完成时间戳 */
  completedAt?: number;
  /** 当前是否活跃（正在展示中） */
  isActive: boolean;
}

export interface NarrativeState {
  // ---- 系统对话队列 ----
  /** 待展示的系统对话队列 */
  dialogueQueue: DialogueEntry[];
  /** 当前正在展示的对话（队列中的第一条） */
  activeDialogue: DialogueEntry | null;
  /** 是否正在打字机播放中 */
  isTyping: boolean;

  // ---- 主线剧情节点 ----
  /** 已激活但尚未完成的剧情节点 */
  activeStoryNode: StoryNodeState | null;
  /** 已完成的剧情节点ID集合 */
  completedNodeIds: Set<string>;

  // ---- 故事标记 ----
  /** 叙事相关的 storyFlags（与 player.progress.storyFlags 保持同步） */
  storyFlags: string[];

  // ---- 阶段状态 ----
  /** 当前系统人格化阶段 */
  currentPhase: SystemPhase;

  // ---- 对话历史 ----
  /** 所有已展示的对话记录 */
  dialogueHistory: DialogueEntry[];

  // ---- 控制状态 ----
  /** 叙事是否被全局暂停（如玩家打开设置面板） */
  isPaused: boolean;
  /** 玩家是否开启了"自动跳过非关键对话" */
  autoSkipNonCritical: boolean;
  /** 打字机播放速度（毫秒/字符） */
  typingSpeed: number;
}

interface NarrativeStore extends NarrativeState {
  // ---- 对话队列操作 ----
  enqueueDialogue: (entry: Omit<DialogueEntry, 'timestamp' | 'read'>) => void;
  dequeueDialogue: () => DialogueEntry | null;
  skipCurrentDialogue: () => void;
  markDialogueRead: (id: string) => void;
  clearDialogueQueue: () => void;

  // ---- 剧情节点操作 ----
  activateStoryNode: (node: StoryNode) => void;
  completeStoryNode: (choiceId?: string) => void;
  dismissActiveNode: () => void;

  // ---- 故事标记操作 ----
  addStoryFlag: (flag: string) => void;
  hasStoryFlag: (flag: string) => boolean;
  setStoryFlags: (flags: string[]) => void;

  // ---- 阶段操作 ----
  setPhase: (phase: SystemPhase) => void;

  // ---- 历史记录 ----
  addToHistory: (entry: DialogueEntry) => void;
  clearHistory: () => void;

  // ---- 控制操作 ----
  setPaused: (paused: boolean) => void;
  setAutoSkip: (autoSkip: boolean) => void;
  setTypingSpeed: (speed: number) => void;
  setIsTyping: (typing: boolean) => void;

  // ---- 批量同步 ----
  syncFromPlayer: (storyFlags: string[], worldsCompleted: number) => void;

  // ---- 重置 ----
  resetNarrative: () => void;
}

// ------------------------------------------------------------------
// 初始状态
// ------------------------------------------------------------------

const initialState: NarrativeState = {
  dialogueQueue: [],
  activeDialogue: null,
  isTyping: false,
  activeStoryNode: null,
  completedNodeIds: new Set(),
  storyFlags: [],
  currentPhase: 'phase1_cold',
  dialogueHistory: [],
  isPaused: false,
  autoSkipNonCritical: false,
  typingSpeed: 30,
};

// ------------------------------------------------------------------
// Store 实现
// ------------------------------------------------------------------

export const useNarrativeStore = create<NarrativeStore>((set, get) => ({
  ...initialState,

  // ---- 对话队列操作 ----

  enqueueDialogue: (entry) =>
    set((state) => {
      const fullEntry: DialogueEntry = {
        ...entry,
        timestamp: Date.now(),
        read: false,
      };
      // 如果当前没有活跃对话且未暂停，直接设为活跃
      const shouldActivate = state.activeDialogue === null && !state.isPaused;
      if (shouldActivate) {
        return {
          activeDialogue: fullEntry,
          isTyping: true,
        };
      }
      return {
        dialogueQueue: [...state.dialogueQueue, fullEntry],
      };
    }),

  dequeueDialogue: () => {
    const state = get();
    if (state.dialogueQueue.length === 0) return null;
    const [next, ...rest] = state.dialogueQueue;
    set({
      dialogueQueue: rest,
      activeDialogue: next,
      isTyping: true,
    });
    return next;
  },

  skipCurrentDialogue: () =>
    set((state) => {
      if (!state.activeDialogue) return state;
      // 将当前对话标记为已读并入历史
      const completed: DialogueEntry = { ...state.activeDialogue, read: true };
      const next = state.dialogueQueue[0] || null;
      const newQueue = state.dialogueQueue.slice(1);
      return {
        activeDialogue: next,
        dialogueQueue: newQueue,
        isTyping: next !== null,
        dialogueHistory: [...state.dialogueHistory, completed],
      };
    }),

  markDialogueRead: (id) =>
    set((state) => {
      if (state.activeDialogue?.id === id) {
        return { activeDialogue: { ...state.activeDialogue, read: true } };
      }
      return {
        dialogueQueue: state.dialogueQueue.map((d) =>
          d.id === id ? { ...d, read: true } : d
        ),
      };
    }),

  clearDialogueQueue: () =>
    set({ dialogueQueue: [], activeDialogue: null, isTyping: false }),

  // ---- 剧情节点操作 ----

  activateStoryNode: (node) =>
    set({
      activeStoryNode: {
        nodeId: node.id,
        node,
        isActive: true,
      },
      isPaused: true, // 激活剧情节点时自动暂停其他叙事
    }),

  completeStoryNode: (_choiceId) =>
    set((state) => {
      if (!state.activeStoryNode) return state;
      const newCompleted = new Set(state.completedNodeIds);
      newCompleted.add(state.activeStoryNode.nodeId);
      return {
        activeStoryNode: null,
        completedNodeIds: newCompleted,
        isPaused: false,
      };
    }),

  dismissActiveNode: () =>
    set({ activeStoryNode: null, isPaused: false }),

  // ---- 故事标记操作 ----

  addStoryFlag: (flag) =>
    set((state) =>
      state.storyFlags.includes(flag)
        ? state
        : { storyFlags: [...state.storyFlags, flag] }
    ),

  hasStoryFlag: (flag) => get().storyFlags.includes(flag),

  setStoryFlags: (flags) => set({ storyFlags: flags }),

  // ---- 阶段操作 ----

  setPhase: (phase) => set({ currentPhase: phase }),

  // ---- 历史记录 ----

  addToHistory: (entry) =>
    set((state) => ({
      dialogueHistory: [...state.dialogueHistory, entry].slice(-200), // 保留最近200条
    })),

  clearHistory: () => set({ dialogueHistory: [] }),

  // ---- 控制操作 ----

  setPaused: (paused) => set({ isPaused: paused }),

  setAutoSkip: (autoSkip) => set({ autoSkipNonCritical: autoSkip }),

  setTypingSpeed: (speed) => set({ typingSpeed: speed }),

  setIsTyping: (typing) => set({ isTyping: typing }),

  // ---- 批量同步 ----

  syncFromPlayer: (storyFlags, worldsCompleted) => {
    const phase = getSystemPhase(worldsCompleted);
    set((state) => ({
      storyFlags: Array.from(new Set([...state.storyFlags, ...storyFlags])),
      currentPhase: phase,
    }));
  },

  // ---- 重置 ----

  resetNarrative: () => set(initialState),
}));

// ------------------------------------------------------------------
// 便捷选择器（用于组件订阅）
// ------------------------------------------------------------------

export const selectActiveDialogue = (state: NarrativeState) =>
  state.activeDialogue;

export const selectHasUnreadDialogue = (state: NarrativeState) =>
  state.activeDialogue !== null && !state.activeDialogue.read;

export const selectActiveStoryNode = (state: NarrativeState) =>
  state.activeStoryNode;

export const selectCurrentPhase = (state: NarrativeState) =>
  state.currentPhase;

export const selectIsNarrativePaused = (state: NarrativeState) =>
  state.isPaused;
