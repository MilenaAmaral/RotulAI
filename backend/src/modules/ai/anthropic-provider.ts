import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider, LlmRequest, LlmResponse } from './llm-provider.js';
import { LlmProviderError } from './llm-provider.js';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
    timeoutMs: number,
  ) {
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 1 });
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: request.maxOutputTokens,
          system: request.system,
          messages: request.messages,
        },
        { signal: request.signal },
      );
      const text = response.content
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('\n')
        .trim();
      return { text, model: response.model };
    } catch (error) {
      throw mapAnthropicError(error);
    }
  }
}

function mapAnthropicError(error: unknown): LlmProviderError {
  if (error instanceof LlmProviderError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new LlmProviderError('timeout', 'Tempo limite excedido ao chamar o provedor de IA.');
  }
  if (error instanceof Anthropic.APIUserAbortError) {
    return new LlmProviderError('timeout', 'Chamada ao provedor de IA cancelada por tempo limite.');
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new LlmProviderError('unavailable', 'Falha de conexão com o provedor de IA.');
  }
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    if (status === 401 || status === 403) {
      return new LlmProviderError('configuration', 'Credencial do provedor de IA inválida ou sem permissão.', status);
    }
    if (status === 404 || status === 400) {
      return new LlmProviderError('configuration', 'Requisição rejeitada pelo provedor (verifique AI_MODEL).', status);
    }
    if (status === 429) {
      return new LlmProviderError('rate_limited', 'Limite de uso do provedor de IA atingido.', status);
    }
    return new LlmProviderError('unavailable', 'Provedor de IA indisponível no momento.', status);
  }
  return new LlmProviderError('unavailable', 'Erro inesperado ao chamar o provedor de IA.');
}
