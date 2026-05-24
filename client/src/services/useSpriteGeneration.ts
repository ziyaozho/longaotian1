import { useState, useCallback, useRef, useEffect } from 'react';
import type { CharacterAppearance } from '../components/character';
import { generateSpritesheetCanvas } from './canvasRenderer';
import { generateImage, buildSpritesheetPrompt } from './imageGeneration';
import { getAttributeHash, getCachedSpritesheet, cacheSpritesheet } from './spriteCache';

interface UseSpriteGenerationResult {
  isGenerating: boolean;
  error: string | null;
  spritesheetUrl: string | null;
  generate: (appearance: CharacterAppearance, useAI?: boolean) => Promise<string | null>;
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

  const generate = useCallback(async (appearance: CharacterAppearance, useAI = true): Promise<string | null> => {
    if (generatingRef.current) return null;
    generatingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const hash = getAttributeHash(appearance);

      // Check cache first
      const cached = await getCachedSpritesheet(hash);
      if (cached) {
        setSpritesheetUrl(cached);
        setIsGenerating(false);
        generatingRef.current = false;
        return cached;
      }

      let dataUrl: string;

      if (useAI) {
        // AI generation via SiliconFlow (requires API key)
        const prompt = buildSpritesheetPrompt(appearance);
        const result = await generateImage({
          prompt,
          model: 'Qwen/Qwen-Image',
          imageSize: '768x512',
          batchSize: 1,
          numInferenceSteps: 20,
        });

        // Download and convert to data URL
        const response = await fetch(result.imageUrl);
        const blob = await response.blob();
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Canvas procedural generation (instant, no API key needed)
        dataUrl = await generateSpritesheetCanvas(appearance);
      }

      await cacheSpritesheet(hash, dataUrl, Date.now());
      setSpritesheetUrl(dataUrl);
      return dataUrl;
    } catch (e) {
      const message = e instanceof Error ? e.message : '生成失败';
      setError(message);
      // Fallback to canvas if AI fails
      if (useAI) {
        try {
          const fallbackUrl = await generateSpritesheetCanvas(appearance);
          const hash = getAttributeHash(appearance);
          await cacheSpritesheet(hash, fallbackUrl, Date.now());
          setSpritesheetUrl(fallbackUrl);
          setError(null);
          return fallbackUrl;
        } catch {
          /* canvas also failed */
        }
      }
      return null;
    } finally {
      setIsGenerating(false);
      generatingRef.current = false;
    }
  }, []);

  return { isGenerating, error, spritesheetUrl, generate, loadFromCache };
}
