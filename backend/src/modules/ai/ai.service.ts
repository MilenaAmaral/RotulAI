import type { AiFeature, PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import type { LlmMessage, LlmProvider } from './llm-provider.js';
import { LlmProviderError } from './llm-provider.js';
import { BASE_SYSTEM_PROMPT } from './prompts.js';

export interface AiServiceOptions {
  timeoutMs: number;
  maxOutputTokens: number;
  maxInputChars: number;
  dailyLimitPerUser: number;
}

export interface AiStatus {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  maxInputChars: number;
  setupInstructions: string | null;
}

export interface AiResult {
  text: string;
  model: string;
}

export const AI_SETUP_INSTRUCTIONS =
  'Para habilitar a IA, defina AI_PROVIDER=anthropic e ANTHROPIC_API_KEY no arquivo backend/.env e reinicie o servidor. As demais áreas do Rotulai continuam funcionando sem a IA.';

/** Tamanho máximo aceito para uma resposta do modelo (proteção contra respostas anômalas). */
const MAX_RESPONSE_CHARS = 12000;

/**
 * Camada de domínio da IA: aplica limites, tempo limite, cota diária, validação da resposta
 * e converte falhas do provedor em erros HTTP seguros. Não conhece o fornecedor específico.
 */
export class AiService {
  constructor(
    private readonly provider: LlmProvider | null,
    private readonly db: PrismaClient,
    private readonly options: AiServiceOptions,
  ) {}

  get maxInputChars(): number {
    return this.options.maxInputChars;
  }

  status(): AiStatus {
    return {
      enabled: this.provider !== null,
      provider: this.provider?.name ?? null,
      model: this.provider?.model ?? null,
      maxInputChars: this.options.maxInputChars,
      setupInstructions: this.provider ? null : AI_SETUP_INSTRUCTIONS,
    };
  }

  async generate(params: {
    userId: string;
    feature: AiFeature;
    guidance: string;
    messages: LlmMessage[];
  }): Promise<AiResult> {
    const provider = this.requireProvider();
    await this.assertWithinDailyQuota(params.userId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    let success = false;
    try {
      const response = await provider.generate({
        system: `${BASE_SYSTEM_PROMPT}\n\n${params.guidance}`,
        messages: params.messages,
        maxOutputTokens: this.options.maxOutputTokens,
        signal: controller.signal,
      });
      const text = typeof response.text === 'string' ? response.text.trim() : '';
      if (!text || text.length > MAX_RESPONSE_CHARS) {
        throw new LlmProviderError('invalid_response', 'Resposta vazia ou fora do formato esperado.');
      }
      success = true;
      return { text, model: response.model || provider.model };
    } catch (error) {
      throw this.toAppError(error, controller.signal.aborted, params.feature);
    } finally {
      clearTimeout(timer);
      await this.recordUsage(params.userId, params.feature, success);
    }
  }

  private requireProvider(): LlmProvider {
    if (!this.provider) {
      throw new AppError(503, 'AI_NOT_CONFIGURED', AI_SETUP_INSTRUCTIONS);
    }
    return this.provider;
  }

  private async assertWithinDailyQuota(userId: string): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const used = await this.db.aiUsageLog.count({ where: { userId, createdAt: { gte: since } } });
    if (used >= this.options.dailyLimitPerUser) {
      throw new AppError(
        429,
        'AI_QUOTA_EXCEEDED',
        'Você atingiu o limite diário de uso da IA. Tente novamente em algumas horas.',
      );
    }
  }

  private async recordUsage(userId: string, feature: AiFeature, success: boolean): Promise<void> {
    try {
      await this.db.aiUsageLog.create({ data: { userId, feature, success } });
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error.message : 'desconhecido' }, 'Falha ao registrar uso da IA');
    }
  }

  private toAppError(error: unknown, aborted: boolean, feature: AiFeature): AppError {
    if (error instanceof AppError) return error;
    const kind = error instanceof LlmProviderError ? error.kind : aborted ? 'timeout' : 'unavailable';
    const status = error instanceof LlmProviderError ? error.status : undefined;
    // Registra apenas metadados: nunca o conteúdo da conversa ou credenciais.
    logger.error({ feature, kind, status }, 'Falha na integração com IA');

    switch (aborted ? 'timeout' : kind) {
      case 'timeout':
        return new AppError(504, 'AI_TIMEOUT', 'A IA demorou demais para responder. Tente novamente.');
      case 'rate_limited':
        return new AppError(503, 'AI_UNAVAILABLE', 'O serviço de IA está sobrecarregado. Tente em instantes.');
      case 'invalid_response':
        return new AppError(502, 'AI_INVALID_RESPONSE', 'A IA retornou uma resposta inválida. Tente novamente.');
      case 'configuration':
        return new AppError(
          503,
          'AI_UNAVAILABLE',
          'O serviço de IA está indisponível por um problema de configuração do servidor.',
        );
      default:
        return new AppError(503, 'AI_UNAVAILABLE', 'O serviço de IA está indisponível no momento. Tente mais tarde.');
    }
  }
}
