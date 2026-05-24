/**
 * 热梗词库 —— 可人工定期更新
 *
 * 原则：
 * 1. 梗必须中文互联网通用，避免过于圈层化
 * 2. 避免时效性太强的热点事件
 * 3. 系统精灵使用梗时必须符合其 dialogueStyle
 */

export interface MemeEntry {
  phrase: string;        // 梗文本
  context: string;       // 适用语境描述
  style: string;         // 风格标签：吐槽/抒情/高燃/搞怪
  intensity: 'mild' | 'moderate' | 'strong'; // 使用强度
}

export const MEME_VOCABULARY: MemeEntry[] = [
  // 通用型梗（长期有效）
  { phrase: '遥遥领先', context: '获得优势或领先时', style: '吐槽', intensity: 'moderate' },
  { phrase: '命运的齿轮开始转动', context: '重大转折或契机', style: '抒情', intensity: 'mild' },
  { phrase: '不是哥们', context: '惊讶或吐槽', style: '吐槽', intensity: 'strong' },
  { phrase: '这波在大气层', context: '智谋深远或布局成功', style: '高燃', intensity: 'moderate' },
  { phrase: '真香', context: '态度反转或承认好处', style: '搞怪', intensity: 'mild' },
  { phrase: '蚌埠住了', context: '忍不住笑或情绪崩溃', style: '吐槽', intensity: 'strong' },
  { phrase: '绝绝子', context: '极度赞赏或极度吐槽', style: '搞怪', intensity: 'moderate' },
  { phrase: '破防了', context: '心理防线被突破', style: '抒情', intensity: 'mild' },
  { phrase: '卷起来了', context: '竞争加剧或内卷场景', style: '吐槽', intensity: 'moderate' },
  { phrase: '躺平', context: '放弃竞争或休息', style: '吐槽', intensity: 'mild' },
  { phrase: '泰裤辣', context: '表达酷或赞赏', style: '搞怪', intensity: 'moderate' },
  { phrase: '主打一个', context: '强调某种风格或态度', style: '吐槽', intensity: 'mild' },

  // 系统精灵专用梗（毒舌风格）
  { phrase: '就这？', context: '奖励太少或表现不佳', style: '吐槽', intensity: 'strong' },
  { phrase: '我emo了', context: '系统精灵表达无奈', style: '搞怪', intensity: 'moderate' },
  { phrase: '主打一个陪伴', context: '系统吐槽宿主不给力', style: '吐槽', intensity: 'mild' },
  { phrase: '栓Q', context: '系统精灵阴阳怪气', style: '搞怪', intensity: 'moderate' },

  // 高燃风格
  { phrase: '燃起来了', context: '重大突破或战斗胜利', style: '高燃', intensity: 'strong' },
  { phrase: '这就是宿命', context: '重大抉择时刻', style: '高燃', intensity: 'mild' },
  { phrase: '逆天改命', context: '突破极限或改变命运', style: '高燃', intensity: 'strong' },
];

/**
 * 根据系统性格筛选合适的梗
 */
export function selectMemesForStyle(
  dialogueStyle: string,
  count: number = 5
): MemeEntry[] {
  const styleMap: Record<string, string[]> = {
    '毒舌': ['吐槽', '搞怪'],
    '吐槽': ['吐槽', '搞怪'],
    '温柔': ['抒情'],
    '高冷': ['高燃'],
    '搞怪': ['搞怪', '吐槽'],
    '高燃': ['高燃', '搞怪'],
  };

  const allowedStyles = styleMap[dialogueStyle] || ['吐槽'];

  const filtered = MEME_VOCABULARY.filter((m) => allowedStyles.includes(m.style));

  // 随机选取 count 个
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
