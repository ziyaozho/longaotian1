export interface MemeResult {
  systemMessage: string;
  toastText: string;
  icon: string;
  color: string;
}

type EventType =
  | 'kill_enemy'
  | 'breakthrough_success'
  | 'breakthrough_fail'
  | 'loot_explosion'
  | 'face_slap'
  | 'fortune_event'
  | 'achievement_unlock'
  | 'daily_signin'
  | 'dark_choice';

export const ALL_EVENT_TYPES: EventType[] = [
  'kill_enemy', 'breakthrough_success', 'breakthrough_fail',
  'loot_explosion', 'face_slap', 'fortune_event',
  'achievement_unlock', 'daily_signin', 'dark_choice',
];

interface EventContext {
  enemyName?: string;
  realmName?: string;
  itemName?: string;
  rarity?: string;
  achievementName?: string;
  [key: string]: unknown;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(template: string, ctx: EventContext): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(ctx[key] ?? ''));
}

const KILL_LINES = [
  '这条素材能上热门了宿主！{enemyName}被你打得妈都不认识，战力粉狂喜！',
  '一刀秒了{enemyName}！这段切片发出去，少说十万播放。',
  '{enemyName}倒下了！宿主你这波操作建议直接申遗。',
];

const BREAKTHROUGH_LINES = [
  '爆了爆了！！宿主突破{realmName}！天道都给你推流了！',
  '{realmName}！！这数据，整个修仙圈都炸了！',
  '从今天起，请叫宿主——{realmName}强者！门槛什么的，不存在的！',
];

const FAIL_LINES = [
  '被天道限流了…{realmName}突破失败。建议换个姿势再冲一次，宿主。',
  '天道不予通过！{realmName}的门槛太高了，宿主你这波操作建议投稿《人类迷惑行为大赏》。',
  '限流了限流了！{realmName}拒绝了你…不过没关系，黑红也是红。',
  '{realmName}的门槛一脚没迈过去…没事，下次带助跑。',
];

const LOOT_GODLY_LINES = [
  '爆了爆了！！【{itemName}】！！这切片必须置顶！！所有粉丝全体起立！！',
  '传说级！！【{itemName}】！！直播间炸了！礼物刷屏中——',
  '天哪宿主！【{itemName}】！这是什么神仙运气？建议直接开播！',
];

const LOOT_NORMAL_LINES = [
  '出货了宿主！【{itemName}】入手！这波不亏！',
  '掉落【{itemName}】，虽然不是传说，但也是好货！',
  '【{itemName}】get！收藏党狂喜！',
];

const FACESLAP_LINES = [
  '名场面来了！{enemyName}现在脸都被打肿了。建议回放三遍。',
  '就这就这？{enemyName}之前不是挺能装的吗？回放已自动保存。',
  '打脸成功！{enemyName}的表情我能笑一年。这段切片我要置顶。',
];

const FORTUNE_LINES = [
  '天降奇遇！这是什么神仙运气？建议宿主立刻去买彩票（虽然这个世界没有）。',
  '奇遇触发！宿主你是天道的亲儿子/亲女儿吧？这运气…羡慕了。',
  '命运之轮转动了！奇遇事件降临，这波不亏血赚！',
];

const ACHIEVEMENT_LINES = [
  '涨粉了涨粉了！成就【{achievementName}】解锁！你在这个世界的\'粉丝\'又多了一群！',
  '新成就解锁！【{achievementName}】！粉丝数+10086，路人转粉进行中！',
  '恭喜宿主获得成就【{achievementName}】！这排面，走路都带风了吧？',
];

const SIGNIN_LINES = [
  '坚持日更的宿主运气不会太差~签到了签到了！',
  '日更打卡！宿主你的坚持，粉丝们都看在眼里！',
  '滴——签到卡！连续更新的宿主，天道都感动了。',
];

const DARK_LINES = [
  '宿主慎重…这条发出去可能会掉一批老粉。不过，有些人就是喜欢黑化路线。',
  '掉粉警告！但话说回来…黑化线有时候比正道线更有流量。',
  '黑化路线启动？评论区估计要吵翻天了…但热度肯定爆炸。',
];

const PACKAGES: Record<EventType, (ctx: EventContext) => MemeResult> = {
  kill_enemy: (ctx) => ({
    systemMessage: fill(pick(KILL_LINES), { enemyName: ctx.enemyName || '敌人' }),
    toastText: '热门素材 +1',
    icon: 'zap',
    color: '#d4a017',
  }),

  breakthrough_success: (ctx) => {
    const realm = ctx.realmName || '新境界';
    return {
      systemMessage: fill(pick(BREAKTHROUGH_LINES), { realmName: realm }),
      toastText: `突破 · ${realm}`,
      icon: 'trending-up',
      color: '#d4a017',
    };
  },

  breakthrough_fail: (ctx) => ({
    systemMessage: fill(pick(FAIL_LINES), { realmName: ctx.realmName || '境界' }),
    toastText: '限流中...',
    icon: 'alert-triangle',
    color: '#888888',
  }),

  loot_explosion: (ctx) => {
    const isGodly = ctx.rarity === 'legendary';
    const name = ctx.itemName || '稀有物品';
    return {
      systemMessage: fill(
        isGodly ? pick(LOOT_GODLY_LINES) : pick(LOOT_NORMAL_LINES),
        { itemName: name },
      ),
      toastText: isGodly ? '爆款诞生！！！' : '出货！',
      icon: 'gift',
      color: isGodly ? '#e74c3c' : '#d4a017',
    };
  },

  face_slap: (ctx) => ({
    systemMessage: fill(pick(FACESLAP_LINES), { enemyName: ctx.enemyName || '那个看不起你的家伙' }),
    toastText: '就这？',
    icon: 'award',
    color: '#1a1a1a',
  }),

  fortune_event: () => ({
    systemMessage: pick(FORTUNE_LINES),
    toastText: '奇遇降临',
    icon: 'sparkles',
    color: '#8e44ad',
  }),

  achievement_unlock: (ctx) => {
    const name = ctx.achievementName || '未知成就';
    return {
      systemMessage: fill(pick(ACHIEVEMENT_LINES), { achievementName: name }),
      toastText: `恭喜宿主解锁成就：【${name}】`,
      icon: 'trophy',
      color: '#d4a017',
    };
  },

  daily_signin: () => ({
    systemMessage: pick(SIGNIN_LINES),
    toastText: '日更达人',
    icon: 'check-circle',
    color: '#27ae60',
  }),

  dark_choice: () => ({
    systemMessage: pick(DARK_LINES),
    toastText: '掉粉警告',
    icon: 'alert-triangle',
    color: '#c0392b',
  }),
};

export function packageEvent(eventType: EventType, context: EventContext = {}): MemeResult {
  const packager = PACKAGES[eventType];
  if (packager) {
    return packager(context);
  }
  return {
    systemMessage: '系统消息：事件已触发',
    toastText: '事件触发',
    icon: 'info',
    color: '#2980b9',
  };
}
