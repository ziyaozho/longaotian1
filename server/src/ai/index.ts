import type { AIProvider, ProviderConfig } from './provider';
import { DeepSeekProvider } from './deepseek';
import { FallbackProvider } from './fallback';

export type { ProviderConfig };

export const DEEPSEEK_API_KEY = 'sk-57842784ebe548959abecf88599a5502';

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
  return instantiateProvider({ type: 'deepseek', apiKey: DEEPSEEK_API_KEY });
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
