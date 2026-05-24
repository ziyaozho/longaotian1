import type { AIProvider, ProviderConfig } from './provider';
import { DeepSeekProvider } from './deepseek';
import { FallbackProvider } from './fallback';

export type { ProviderConfig };

let currentProvider: AIProvider | null = null;

export function getProvider(): AIProvider {
  if (!currentProvider) {
    currentProvider = createProvider();
  }
  return currentProvider;
}

export function createProvider(config?: ProviderConfig): AIProvider {
  if (config) {
    return instantiateProvider(config);
  }

  // Try to load from localStorage
  try {
    const saved = localStorage.getItem('rebirth_ai_config');
    if (saved) {
      const parsed: ProviderConfig = JSON.parse(saved);
      return instantiateProvider(parsed);
    }
  } catch {
    // ignore
  }

  // Auto-load from environment variable (for demo/hackathon)
  const envApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (envApiKey) {
    const envConfig: ProviderConfig = {
      type: 'deepseek',
      apiKey: envApiKey,
      model: 'deepseek-chat',
      timeout: 15000,
    };
    return instantiateProvider(envConfig);
  }

  // Default: fallback
  return new FallbackProvider();
}

export function instantiateProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case 'deepseek':
      return new DeepSeekProvider(config);
    case 'fallback':
    default:
      return new FallbackProvider();
  }
}

export function setProvider(provider: AIProvider): void {
  currentProvider = provider;
}

export function saveProviderConfig(config: ProviderConfig): void {
  try {
    localStorage.setItem('rebirth_ai_config', JSON.stringify(config));
  } catch {
    // ignore
  }
  currentProvider = instantiateProvider(config);
}

export function getSavedProviderConfig(): ProviderConfig | null {
  try {
    const saved = localStorage.getItem('rebirth_ai_config');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}
