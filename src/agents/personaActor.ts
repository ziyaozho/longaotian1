import type { PersonaActorInput } from './types';
import { MEME_VOCABULARY, selectMemesForStyle } from '../data/memes';
import { selectPersonaTemplate } from './systemPersona';
import { DEEPSEEK_API_KEY } from '../ai';

/**
 * 性格演员 (Persona Actor) §3.5
 * 全部交由大模型生成，不使用预制本地模板。
 * 本地逻辑仅用于构建 AI prompt 的上下文描述。
 */

/**
 * 构建系统发言的 AI prompt（注入人格描述）
 */
function buildPersonaPrompt(input: PersonaActorInput & { streak?: number; itemName?: string }): string {
  const { systemName, personality, sceneContext, eventSummary, memeHints, streak, itemName } = input;

  // 使用系统人格模板库作为 prompt 中的"人设卡"
  const persona = selectPersonaTemplate(personality);
  const examples = [
    persona.opening,
    ...persona.dailyCheckIn.slice(0, 1),
    ...persona.breakthrough.slice(0, 1),
  ].join('\n');

  const memeText = memeHints.length > 0
    ? `可融入的热梗：${memeHints.join('、')}`
    : '';

  const streakText = streak ? `（连续签到第${streak}天）` : '';
  const itemText = itemName ? `（涉及道具：${itemName}）` : '';

  return `你是系统精灵"${systemName}"，性格「${persona.style}」。
你的发言风格示例：
${examples}

当前场景：${sceneContext}
刚刚发生：${eventSummary}${streakText}${itemText}
${memeText}

请生成一句符合上述性格的系统消息。以"叮！"开头，50字以内，简洁有力，贴合语境。
直接输出文本，不要JSON包装。`;
}

/**
 * 生成系统发言 —— 全部由大模型生成
 * 仅在 API 完全不可用时使用极简降级
 */
export async function generateSystemDialogue(
  input: PersonaActorInput & { streak?: number; itemName?: string }
): Promise<string> {
  const prompt = buildPersonaPrompt(input);
  if (!DEEPSEEK_API_KEY) {
    return `叮！${input.systemName}运行正常。`;
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个系统流小说中的系统精灵，负责向宿主发送系统提示。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      return `叮！${input.systemName}运行正常。`;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || `叮！${input.systemName}运行正常。`;
  } catch {
    return `叮！${input.systemName}运行正常。`;
  }
}

/** @deprecated 由 generateSystemDialogue 替代 */
export function generateSystemDialogueLocal(input: PersonaActorInput & { streak?: number; itemName?: string }): string {

  return `叮！${input.systemName}运行正常。`;
}

/**
 * 传说级道具发放 —— 由 AI 生成庆祝对话
 */
export async function generateLegendaryDropLine(
  systemName: string,
  artifactName: string,
  artifactDesc: string
): Promise<string> {
  if (!DEEPSEEK_API_KEY) return `叮！${systemName}：恭喜宿主获得传说级道具【${artifactName}】！`;
  const prompt = `你是系统精灵"${systemName}"。宿主刚刚获得了传说级逆天道具【${artifactName}】——${artifactDesc}。
请生成一句充满"龙傲天爽文"感、"中二"感、"网文金手指"风格的系统公告。
以"叮！"开头，60字以内，语气夸张热血。直接输出文本。`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.0,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return `叮！${systemName}：恭喜宿主获得传说级道具【${artifactName}】！`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim()
      || `叮！${systemName}：恭喜宿主获得传说级道具【${artifactName}】！`;
  } catch {
    return `叮！${systemName}：恭喜宿主获得传说级道具【${artifactName}】！`;
  }
}

/**
 * 为性格演员构建 AI prompt 输入
 */
export function buildPersonaInput(params: {
  player: import('../types').Player;
  sceneContext: string;
  eventSummary: string;
}): PersonaActorInput {
  const { player, sceneContext, eventSummary } = params;
  const dialogStyle = player.extendedSystem.dialogueStyle || '毒舌';
  const memes = selectMemesForStyle(dialogStyle, 3);

  return {
    systemName: player.system.name,
    personality: dialogStyle,
    sceneContext,
    eventSummary,
    memeHints: memes.map((m) => m.phrase),
  };
}
