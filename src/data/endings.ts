import type { EndingDefinition } from '../types';

/**
 * 8个隐藏结局定义
 * 对应8个世界场景，每个结局有独特的达成条件和基调
 */
export const ENDINGS: EndingDefinition[] = [
  {
    endingId: 'ending_modern_king',
    name: '都市之王',
    description:
      '主角凭借系统之力成为都市暗面的统治者，站在权力之巅俯瞰众生。财富、声望、力量皆在手，但蓦然回首，发现自己早已失去了最初的纯真与平凡的快乐。',
    victoryConditions: ['wealth >= 100000', 'fame >= 1000', 'combatPower >= 5000'],
    failConditions: ['dead', 'wealth <= 0'],
    tone: '霸气但带孤独',
  },
  {
    endingId: 'ending_immortal_hermit',
    name: '隐世丹神',
    description:
      '主角凭借逆天天赋成为最强炼丹师，炼制出传说中的九转金丹。但站在巅峰之时，他选择远离纷争，与一路相伴的红颜知己隐居山林，从此不问世事，只问丹心。',
    victoryConditions: ['has_item:九转金丹', 'npc:苏晴 >= 80'],
    failConditions: ['dead', 'talent <= 5', 'npc:苏晴 <= -50'],
    tone: '温情但带一点遗憾',
  },
  {
    endingId: 'ending_urban_legend',
    name: '都市传说',
    description:
      '主角在都市的暗影中行走了太久，最终成为了人们口中虚无缥缈的"传说"。有人说他已经飞升，有人说他从未存在过。只有深夜的街头，偶尔还能看见一道熟悉的身影。',
    victoryConditions: ['fame >= 2000', 'combatPower >= 8000'],
    failConditions: ['dead', 'fame <= -100'],
    tone: '神秘而悲凉',
  },
  {
    endingId: 'ending_apocalypse_savior',
    name: '末世救主',
    description:
      '末世降临，人类文明濒临崩溃。主角带领幸存者们建立了最后的避难所，成为了人们心中的救世主。但每一次救下一条生命，他都要承受一份沉重的代价。',
    victoryConditions: ['combatPower >= 10000', 'level >= 50'],
    failConditions: ['dead', 'level <= 10'],
    tone: '热血而沉重',
  },
  {
    endingId: 'ending_apoc_fantasy_rider',
    name: '天启骑士',
    description:
      '末日预言中的天启骑士之力在主角体内觉醒。他骑着由烈焰构成的战马，手持审判之刃，成为了新世界秩序的执行者。正义与毁灭，只在一念之间。',
    victoryConditions: ['combatPower >= 12000', 'talent >= 8'],
    failConditions: ['dead', 'physique <= 3'],
    tone: '宿命而壮烈',
  },
  {
    endingId: 'ending_hidden_immortal',
    name: '仙道独尊',
    description:
      '主角在洪荒世界中历经万劫，终于证得大道，成为了那方天地唯一的仙道至尊。万古长存，与世无争，却也与世绝缘。',
    victoryConditions: ['level >= 80', 'talent >= 9'],
    failConditions: ['dead'],
    tone: '超脱而寂寥',
  },
  {
    endingId: 'ending_cyber_god',
    name: '数据飞升',
    description:
      '主角将自己的意识完全上传到了数字世界，抛弃了脆弱的肉体。在由0和1构成的永恒空间中，他成为了真正的"神"——冰冷、理性、全知，却也失去了感受温度的心跳。',
    victoryConditions: ['intelligence >= 10', 'level >= 60'],
    failConditions: ['dead', 'intelligence <= 3'],
    tone: '冰冷而自由',
  },
  {
    endingId: 'ending_demon_overlord',
    name: '魔神降世',
    description:
      '主角体内的魔族血脉彻底觉醒，上古魔神的意志与他融为一体。他撕裂了天地的屏障，将深渊的力量带到了人间。这不是毁灭，而是新生——以他的方式。',
    victoryConditions: ['combatPower >= 15000', 'talent >= 8'],
    failConditions: ['dead', 'luck <= 2'],
    tone: '霸气而黑暗',
  },
];

/** 快速查询 */
export function getEndingById(endingId: string): EndingDefinition | undefined {
  return ENDINGS.find((e) => e.endingId === endingId);
}

/** 获取所有结局ID */
export function getAllEndingIds(): string[] {
  return ENDINGS.map((e) => e.endingId);
}
