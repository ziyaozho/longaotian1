import { generateSpritesheetCanvas } from './canvasRenderer';
import type { CharacterAppearance } from '../components/character';

const API_URL = 'https://api.siliconflow.cn/v1/images/generations';

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  imageSize?: string;
  batchSize?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
  negativePrompt?: string;
}

export interface GenerateImageResult {
  imageUrl: string;
  seed: number;
  inferenceMs: number;
}

export class ImageGenerationError extends Error {
  statusCode: number;
  apiError?: unknown;

  constructor(message: string, statusCode: number, apiError?: unknown) {
    super(message);
    this.name = 'ImageGenerationError';
    this.statusCode = statusCode;
    this.apiError = apiError;
  }
}

function getApiKey(): string {
  const key =
    typeof window !== 'undefined'
      ? (window as unknown as Record<string, string | undefined>).__SILICONFLOW_KEY__
      : undefined;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('siliconflow_api_key') : null;
  return key || import.meta.env.VITE_SILICONFLOW_API_KEY || localKey || '';
}

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.startsWith('sk-your-')) {
    throw new ImageGenerationError('请先配置 VITE_SILICONFLOW_API_KEY 环境变量', 0);
  }

  const body = {
    model: params.model || 'Qwen/Qwen-Image',
    prompt: params.prompt,
    image_size: params.imageSize || '768x512',
    batch_size: params.batchSize ?? 1,
    num_inference_steps: params.numInferenceSteps ?? 20,
    guidance_scale: params.guidanceScale ?? 7.5,
    seed: params.seed ?? Math.floor(Math.random() * 9999999999),
    negative_prompt: params.negativePrompt || '',
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    throw new ImageGenerationError(
      `SiliconFlow API 错误 (${response.status})`,
      response.status,
      errorBody,
    );
  }

  const data = await response.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) {
    throw new ImageGenerationError('API 返回中未找到图片 URL', response.status, data);
  }

  return {
    imageUrl,
    seed: data.seed ?? body.seed,
    inferenceMs: data.timings?.inference ?? 0,
  };
}

export function buildSpritesheetPrompt(appearance: {
  talent: number;
  appearance: number;
  intelligence: number;
  physique: number;
  family: number;
  luck: number;
}): string {
  // 属性描述（中文，Qwen-Image 对中文理解更好）
  const talentDesc =
    appearance.talent >= 8
      ? '天赋异禀，周身有灵气光环，眼神中带有超凡神采，额间可能有神秘印记'
      : appearance.talent >= 5
        ? '气质不凡，目光自信锐利，有主角气场'
        : '气质平平，看起来普通';

  const faceDesc =
    appearance.appearance >= 8
      ? '颜值极高，五官精致如画，俊美/绝美的面容'
      : appearance.appearance >= 5
        ? '长相端正，五官协调，顺眼耐看'
        : '相貌普通，路人脸';

  const eyeDesc =
    appearance.intelligence >= 8
      ? '眼神深邃锐利，充满智慧，目光如炬，可能戴金丝眼镜或有神秘光泽'
      : appearance.intelligence >= 5
        ? '眼神清澈，透着机灵'
        : '眼神单纯，朴实无华';

  const buildDesc =
    appearance.physique >= 8
      ? '身材魁梧健硕，肩宽体壮，充满力量感'
      : appearance.physique >= 5
        ? '身材匀称，健康结实'
        : '身材单薄瘦弱';

  const outfitDesc =
    appearance.family >= 8
      ? '身穿华贵的锦衣长袍，金线刺绣，绸缎面料，尽显贵族气派'
      : appearance.family >= 5
        ? '穿着整洁得体的常服，干净大方'
        : '衣衫简朴，甚至有些破旧但整洁';

  const luckAura =
    appearance.luck >= 8
      ? '周身环绕淡淡的金色祥瑞之气，似有幸运符随身'
      : appearance.luck >= 5
        ? '神态平和，自带一丝温润气质'
        : '';

  // 统一的种子描述，确保6个面板是同一个角色
  const characterSeed = `龙傲天主角，${faceDesc}，${eyeDesc}，${buildDesc}，${talentDesc}，${outfitDesc}，${luckAura}`;

  return [
    '一张严格规范的2行3列角色表情精灵图（sprite sheet），总共6个等大的正方形面板，排列成3列2行的规整网格。',
    '画风要求：国漫/少年漫风格，粗黑墨线轮廓，类似《一人之下》或《斗罗大陆》漫画的黑白漫风格，带有少量金色点缀。',
    '背景为纯白或浅米色，每个面板之间有明显但细的分隔线。',
    `角色统一设定：${characterSeed}。`,
    '6个面板必须是同一个人，发型、服装、面容完全一致，只有表情不同。半身像，从头部到大腿根部。',
    '第一行从左到右：',
    '1. 中性表情：面容平静，嘴角平直，眼神淡然，龙傲天式的从容。',
    '2. 开心表情：嘴角上扬，露出自信的笑容，眼神明亮，略带傲气。',
    '3. 愤怒表情：眉头紧皱，眼角吊起，咬牙切齿，额角有青筋或 anger mark。',
    '第二行从左到右：',
    '4. 悲伤表情：眼角低垂，嘴角下撇，眼中含泪，神情落寞。',
    '5. 惊讶表情：眼睛睁大，嘴巴微张成O型，眉毛高高挑起。',
    '6. 坚毅表情：眼神坚定，嘴唇紧闭，眉头微蹙，充满战斗意志。',
    '严格要求：画面中绝对不能有任何文字、字母、数字、标签、对话框。只输出纯角色立绘。',
    '每个面板尺寸相同，角色在每个面板中的位置和大小尽量一致。',
  ].join('\n');
}

const SPRITESHEET_PROMPT_CACHE: Record<string, string> = {};

export function getSpritesheetPrompt(
  appearance: {
    talent: number;
    appearance: number;
    intelligence: number;
    physique: number;
    family: number;
    luck: number;
  },
): string {
  const hash = `${appearance.talent}-${appearance.appearance}-${appearance.intelligence}-${appearance.physique}-${appearance.family}-${appearance.luck}`;
  if (!SPRITESHEET_PROMPT_CACHE[hash]) {
    SPRITESHEET_PROMPT_CACHE[hash] = buildSpritesheetPrompt(appearance);
  }
  return SPRITESHEET_PROMPT_CACHE[hash];
}
