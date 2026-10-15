import type { Env } from '../../config/env.js';
import { AnthropicProvider } from './anthropic-provider.js';
import type { LlmProvider } from './llm-provider.js';

/** Retorna o provedor configurado ou null quando a IA não está habilitada. */
export function createLlmProvider(config: Env): LlmProvider | null {
  switch (config.AI_PROVIDER) {
    case 'anthropic': {
      const apiKey = config.ANTHROPIC_API_KEY?.trim();
      if (!apiKey) return null;
      return new AnthropicProvider(apiKey, config.AI_MODEL, config.AI_TIMEOUT_MS);
    }
    case 'none':
      return null;
  }
}
