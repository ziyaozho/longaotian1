import type { Player } from '../types';
import type { StoryWeaverOutput, TruthSeerValidation } from './types';
import {
  validateGeneratedContent,
  recordValidation,
  type GeneratedTurnPayload,
} from '../engine/hallucinationGuard';

const MAX_RETRIES = 2;

/**
 * 真实之眼 (Truth Seer) §3.4
 * 包装 hallucinationGuard，添加自动重试机制
 */

/**
 * 将 StoryWeaver 输出转为校验用的 payload
 */
function toPayload(output: StoryWeaverOutput): GeneratedTurnPayload {
  return {
    narrative: output.sceneDescription,
    systemDialogue: output.systemDialogue,
    choices: output.playerChoices,
    attributeChanges: output.attributeChanges,
    newEvents: output.newEvents,
    npcMentions: extractNPCMentions(output.sceneDescription + output.npcInteractions),
  };
}

/**
 * 从文本中提取提及的 NPC 名称
 */
function extractNPCMentions(text: string): string[] {
  // 简单的中文名字提取（2-3个中文字符的连续序列）
  const matches = text.match(/[一-鿿]{2,3}(?=[^a-zA-Z0-9一-鿿]|$)/g) || [];
  return [...new Set(matches)];
}

/**
 * 校验剧情输出
 */
export function validateStoryOutput(
  output: StoryWeaverOutput,
  player: Player
): { accepted: boolean; issues: string[] } {
  const payload = toPayload(output);
  const result = validateGeneratedContent(payload, player);
  recordValidation(result);

  return {
    accepted: result.valid,
    issues: result.issues.map((i) => `[${i.severity}] ${i.message}`),
  };
}

/**
 * 校验 + 重试（由协调器调用）
 * 包含重试机制：校验失败时重试
 */
export async function validateAndRetry(
  generateFn: () => Promise<{ output: StoryWeaverOutput; usedFallback: boolean }>,
  player: Player
): Promise<TruthSeerValidation> {
  let lastOutput: StoryWeaverOutput | undefined;
  let allIssues: string[] = [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await generateFn();

    if (attempt === 0 || result.usedFallback) {
      lastOutput = result.output;
    }

    const validation = validateStoryOutput(lastOutput!, player);

    if (validation.accepted) {
      return {
        accepted: true,
        issues: validation.issues,
        retriesUsed: attempt,
        correctedOutput: lastOutput,
      };
    }

    allIssues = [...allIssues, ...validation.issues];

    // 如果是最后一次尝试或已用降级，接受当前输出
    if (attempt === MAX_RETRIES || result.usedFallback) {
      return {
        accepted: false,
        issues: allIssues,
        retriesUsed: attempt,
        correctedOutput: lastOutput,
      };
    }
  }

  return {
    accepted: false,
    issues: allIssues,
    retriesUsed: MAX_RETRIES,
    correctedOutput: lastOutput,
  };
}

/**
 * 构建重试提示（注入到下一轮 prompt）
 */
export function buildRetryContext(issues: string[]): string {
  if (issues.length === 0) return '';
  return `[生成错误，请修正：\n${issues.join('\n')}\n请重新生成不含上述问题的剧情。]`;
}
