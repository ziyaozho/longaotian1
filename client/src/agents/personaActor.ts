import type { Player, Artifact } from '../types';
import type { SystemPersona } from './types';
import { getSystemById } from '../data/systems';

const MEME_BANK: Record<string, string[]> = {
  roast: [
    '你这操作，我看不懂但大受震撼',
    '不愧是你，永远在翻车的路上狂奔',
    '今天的你也在稳定发挥...稳定地让人血压升高',
  ],
  hype: [
    '燃起来了！这才是我选中的人！',
    '全场最佳！建议反复观看这一回合！',
    '天不生你，万古如长夜！',
  ],
  heartfelt: [
    '走了这么远的路，辛苦你了。',
    '不必逞强，有些战斗不用一个人扛。',
    '今日的相遇是明日的伏笔。',
  ],
  daily: [
    '又是平凡的一天呢～',
    '今天有什么计划吗？',
    '日子一天天过，但每一天都独一无二。',
  ],
};

const LEGENDARY_CELEBRATION: Record<string, string[]> = {
  small_green_bottle: [
    '叮！宿主获得传说级奇物——「小绿瓶」！此瓶看似平凡，却能吸收月华凝结灵液。天下灵植，皆可催熟！种田流玩家的终极神器！',
    '叮！隐藏奖励触发！「小绿瓶」已发放至背包。一滴绿液，可抵十年苦功。炼丹宗师的必由之路！',
  ],
  realm_breaker: [
    '叮！宿主获得传说级奇物——「破界珠」！空间壁垒对你而言不过是一层薄纸。每日一次空间跳跃，冷却10回合。打不过就跑，跑不过就跳！',
    '叮！「破界珠」认主！从今日起，天下之大皆可去得。跨越世界壁垒，探索未知位面，冒险的新篇章已开启！',
  ],
  fate_wheel: [
    '叮！宿主连续签到7天，触发隐藏奖励——「命运轮盘」！凡抽奖者，非酋还是欧皇，一念天堂一念地狱。请开始你的表演！',
    '叮！「命运轮盘」已装备！每天转动一次，随机获得属性提升或诅咒。赌徒的浪漫，命运的对赌——你今天转了吗？',
  ],
  memory_book: [
    '叮！宿主获得传说级奇物——「记忆之书」！此书自动记录所有已发生事件，可回放剧情细节。有了它，你就是行走的历史档案馆！',
    '叮！「记忆之书」绑定成功！防幻觉、识谎言、预判走向——信息就是力量，而你手握整个世界的情报！',
  ],
};

export function getSystemPersona(player: Player): SystemPersona {
  const sysDef = getSystemById(player.system.id);

  const personality = sysDef?.personality || '冷静理智的引导者';
  const catchphrase = sysDef?.catchphrase || '叮！';

  const level = player.system.level;
  let memeStyle: SystemPersona['memeStyle'] = 'daily';
  if (level <= 2) memeStyle = 'daily';
  else if (level <= 4) memeStyle = 'heartfelt';
  else if (level <= 6) memeStyle = 'roast';
  else memeStyle = 'hype';

  return {
    name: player.system.name,
    personality,
    catchphrase,
    memeStyle,
  };
}

export function generateSystemDialogue(
  persona: SystemPersona,
  sceneContext: string,
  _eventSummary: string,
): string {
  const memes = MEME_BANK[persona.memeStyle] || MEME_BANK.daily;
  const meme = memes[Math.floor(Math.random() * memes.length)];

  const shouldInjectMeme = Math.random() < 0.3;

  if (shouldInjectMeme) {
    return `${persona.catchphrase} ${meme}`;
  }

  const lines = [
    `${persona.catchphrase} 系统运行正常。当前场景：${sceneContext.slice(0, 30)}...继续前进吧。`,
    `${persona.catchphrase} 检测到周围有值得关注的事物。保持警惕。`,
    `${persona.catchphrase} ${persona.name}持续为你护航。下一步怎么走？`,
  ];

  return lines[Math.floor(Math.random() * lines.length)];
}

export function buildPersonaPrompt(persona: SystemPersona): string {
  return `你是系统精灵"${persona.name}"，性格：${persona.personality}。说话风格：${persona.memeStyle === 'roast' ? '带点吐槽' : persona.memeStyle === 'hype' ? '热血激昂' : persona.memeStyle === 'heartfelt' ? '温暖走心' : '日常陪伴'}。口头禅是"${persona.catchphrase}"。`;
}

export function generateArtifactCelebration(artifact: Artifact): string {
  const celebrations = LEGENDARY_CELEBRATION[artifact.id];
  if (!celebrations) {
    return `叮！获得传说级道具【${artifact.name}】！${artifact.description}`;
  }
  return celebrations[Math.floor(Math.random() * celebrations.length)];
}
