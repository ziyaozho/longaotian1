/**
 * ============================================================
 * 《万界行者》叙事系统总入口
 * ============================================================
 */

// 世界观架构
export {
  CORE_LORE,
  WORLD_BRANCHES,
  MAIN_STORY_BEATS,
  NARRATIVE_PRINCIPLES,
} from './worldSetting';
export type { WorldBranch, StoryBeat } from './worldSetting';

// 系统人格化对话
export {
  SYSTEM_PHASE_THRESHOLDS,
  getSystemPhase,
  ALL_SYSTEM_DIALOGUE,
  SIGN_IN_DIALOGUE,
  STATUS_PANEL_DIALOGUE,
  TASK_SYSTEM_DIALOGUE,
  LOTTERY_DIALOGUE,
  COPY_SYSTEM_DIALOGUE,
  SHOP_DIALOGUE,
  ALCHEMY_DIALOGUE,
  PET_SYSTEM_DIALOGUE,
  DEVOUR_SYSTEM_DIALOGUE,
  TIME_SYSTEM_DIALOGUE,
  STORY_CRITICAL_DIALOGUE,
  getDialogueForPhase,
  getDialogueByTrigger,
} from './systemDialogue';
export type { SystemPhase, SystemDialogueLine, SystemDialogueCategory } from './systemDialogue';

// 场景主线剧情弧
export {
  ALL_SCENE_ARCS,
  MODERN_CITY_ARC,
  CULTIVATION_ARC,
  URBAN_FANTASY_ARC,
  APOCALYPSE_ARC,
  APOC_FANTASY_ARC,
  HIDDEN_IMMORTAL_ARC,
  HIDDEN_CYBER_ARC,
  HIDDEN_DEMON_ARC,
  getSceneArcById,
} from './sceneArcs';
export type { SceneArc, StoryNode, StoryChoice } from './sceneArcs';

// 核心NPC角色卡
export {
  ALL_CHARACTER_CARDS,
  SYSTEM_CHARACTER,
  DEVOURER_CHARACTER,
  MODERN_CITY_NPC,
  CULTIVATION_NPC,
  APOCALYPSE_NPC,
  DEMON_MOTHER_CHARACTER,
  getCharacterById,
} from './characterCards';
export type { CharacterCard, CharacterVoicePillars } from './characterCards';

// 系统人格化语气引擎
export { getVoiceMode, getSystemLine } from './systemVoice';
export type { VoiceMode, VoiceConfig, VoiceContext } from './systemVoice';
