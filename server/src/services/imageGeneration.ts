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
  return key || import.meta.env.VITE_SILICONFLOW_API_KEY || '';
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
  const talentDesc =
    appearance.talent >= 8
      ? 'extraordinary aura, unique markings or glowing eyes'
      : appearance.talent >= 5
        ? 'confident stance, sharp gaze'
        : 'ordinary presence, simple demeanor';

  const faceDesc =
    appearance.appearance >= 8
      ? 'strikingly handsome/beautiful face with refined features'
      : appearance.appearance >= 5
        ? 'pleasant looking face with balanced features'
        : 'plain face with simple features';

  const eyeDesc =
    appearance.intelligence >= 8
      ? 'piercing intelligent eyes with deep insight, glasses or mystical gleam'
      : appearance.intelligence >= 5
        ? 'thoughtful eyes showing wit'
        : 'simple honest eyes';

  const buildDesc =
    appearance.physique >= 8
      ? 'muscular athletic build, broad shoulders, battle-ready stance'
      : appearance.physique >= 5
        ? 'fit average build'
        : 'slim slender build';

  const outfitDesc =
    appearance.family >= 8
      ? 'luxurious noble outfit with intricate details, gold embroidery, silk fabric'
      : appearance.family >= 5
        ? 'well-made commoner clothes, clean and tidy'
        : 'simple rough clothing, patched but dignified';

  const luckAura =
    appearance.luck >= 8
      ? 'subtle golden sparkles around the character, lucky charm visible'
      : appearance.luck >= 5
        ? 'faint warm glow around edges'
        : '';

  return [
    'A 3x2 grid sprite sheet (3 columns, 2 rows) of a manga character in One Piece / Shonen Jump art style.',
    'Thick black ink outlines, halftone shading, dynamic manga aesthetic.',
    'Character description:',
    `${faceDesc}, ${eyeDesc}, ${buildDesc}.`,
    `${talentDesc}. ${outfitDesc}. ${luckAura}`,
    'The 6 panels in a 3x2 grid show different expressions:',
    'Top row left to right: 1 neutral calm, 2 happy big grin, 3 angry with anger mark.',
    'Bottom row left to right: 4 sad with tears, 5 surprised wide-eyed, 6 determined battle-ready fierce.',
    'Each panel exactly the same size, evenly spaced in a 3-column 2-row grid.',
    'The character must be the same person in all 6 panels — same face, hair, outfit.',
    'No text, no labels, no speech bubbles. Pure character art.',
    'Half-body portrait style, showing head to mid-torso in each panel.',
  ]
    .join(' ')
    .trim();
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
