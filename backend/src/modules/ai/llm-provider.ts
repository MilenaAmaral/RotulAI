/**
 * Contrato independente de fornecedor para modelos de linguagem.
 * Para trocar de provedor, basta implementar esta interface e registrá-la em provider-factory.ts.
 */
export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  maxOutputTokens: number;
  signal: AbortSignal;
}

export interface LlmResponse {
  text: string;
  model: string;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  generate(request: LlmRequest): Promise<LlmResponse>;
}

export type LlmErrorKind = 'timeout' | 'unavailable' | 'rate_limited' | 'invalid_response' | 'configuration';

/** Erro normalizado lançado pelos adaptadores; nunca contém a chave de API. */
export class LlmProviderError extends Error {
  constructor(
    public readonly kind: LlmErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'LlmProviderError';
  }
}
