import { useState, useCallback, useRef } from 'react';
import type { CharacterAppearance } from '../components/character';
import { generateImage, buildSpritesheetPrompt } from './imageGeneration';
import { getAttributeHash, getCachedSpritesheet, cacheSpritesheet, downloadImageAsDataUrl } from './spriteCache';

interface UseSpriteGenerationResult {
  isGenerating: boolean;
  error: string | null;
  spritesheetUrl: string | null;
  generate: (appearance: CharacterAppearance) => Promise<string | null>;
  loadFromCache: (appearance: CharacterAppearance) => Promise<string | null>;
}

export function useSpriteGeneration(): UseSpriteGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spritesheetUrl, setSpritesheetUrl] = useState<string | null>(null);
  const generatingRef = useRef(false);

  const loadFromCache = useCallback(async (appearance: CharacterAppearance): Promise<string | null> => {
    const hash = getAttributeHash(appearance);
    const cached = await getCachedSpritesheet(hash);
    if (cached) {
      setSpritesheetUrl(cached);
      return cached;
    }
    return null;
  }, []);

  const generate = useCallback(async (appearance: CharacterAppearance): Promise<string | null> => {
    if (generatingRef.current) return null;
    generatingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const hash = getAttributeHash(appearance);

      const cached = await getCachedSpritesheet(hash);
      if (cached) {
        setSpritesheetUrl(cached);
        setIsGenerating(false);
        generatingRef.current = false;
        return cached;
      }

      const prompt = buildSpritesheetPrompt(appearance);
      const result = await generateImage({
        prompt,
        model: 'Qwen/Qwen-Image',
        imageSize: '768x512',
        batchSize: 1,
        numInferenceSteps: 20,
      });

      const dataUrl = await downloadImageAsDataUrl(result.imageUrl);
      await cacheSpritesheet(hash, dataUrl, result.seed);
      setSpritesheetUrl(dataUrl);
      return dataUrl;
    } catch (e) {
      const message = e instanceof Error ? e.message : '生成失败';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  }, []);

  return { isGenerating, error, spritesheetUrl, generate, loadFromCache };
}
