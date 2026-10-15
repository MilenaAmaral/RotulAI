import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { AppError } from '../../src/lib/errors.js';
import { AI_SETUP_INSTRUCTIONS, AiService } from '../../src/modules/ai/ai.service.js';
import type { LlmProvider, LlmRequest, LlmResponse } from '../../src/modules/ai/llm-provider.js';
import { LlmProviderError } from '../../src/modules/ai/llm-provider.js';

/** Banco em memória com apenas o necessário para o controle de cota. */
function fakeDb(usedToday = 0) {
  const records: Array<{ feature: string; success: boolean }> = [];
  const db = {
    aiUsageLog: {
      count: async () => usedToday + records.length,
      create: async ({ data }: { data: { feature: string; success: boolean } }) => {
        records.push(data);
        return data;
      },
    },
  };
  return { db: db as unknown as PrismaClient, records };
}

function provider(handler: (request: LlmRequest) => Promise<LlmResponse>): LlmProvider & { calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return {
    name: 'fake',
    model: 'fake-model',
    calls,
    generate: (request) => {
      calls.push(request);
      return handler(request);
    },
  };
}

const options = { timeoutMs: 100, maxOutputTokens: 200, maxInputChars: 500, dailyLimitPerUser: 3 };
const params = {
  userId: 'u1',
  feature: 'CHAT' as const,
  guidance: 'Orientação de teste',
  messages: [{ role: 'user' as const, content: 'Oi' }],
};

async function expectAppError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).statusCode).toBe(status);
  expect((error as AppError).code).toBe(code);
}

describe('AiService', () => {
  it('informa como habilitar a IA quando não há provedor configurado', async () => {
    const service = new AiService(null, fakeDb().db, options);
    expect(service.status()).toMatchObject({ enabled: false, setupInstructions: AI_SETUP_INSTRUCTIONS });
    await expectAppError(service.generate(params), 503, 'AI_NOT_CONFIGURED');
  });

  it('envia instruções de segurança, limites e registra uso bem-sucedido', async () => {
    const fake = provider(async () => ({ text: '  Resposta educacional.  ', model: 'fake-model-v1' }));
    const { db, records } = fakeDb();
    const result = await new AiService(fake, db, options).generate(params);

    expect(result).toEqual({ text: 'Resposta educacional.', model: 'fake-model-v1' });
    expect(fake.calls[0]?.system).toContain('Não diagnostique');
    expect(fake.calls[0]?.system).toContain('Não invente estudos');
    expect(fake.calls[0]?.system).toContain('Orientação de teste');
    expect(fake.calls[0]?.maxOutputTokens).toBe(200);
    expect(records).toEqual([{ userId: 'u1', feature: 'CHAT', success: true }]);
  });

  it('converte demora excessiva em AI_TIMEOUT abortando a chamada', async () => {
    const fake = provider(
      (request) =>
        new Promise((_resolve, reject) => {
          request.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const { db, records } = fakeDb();
    await expectAppError(new AiService(fake, db, options).generate(params), 504, 'AI_TIMEOUT');
    expect(records[0]?.success).toBe(false);
  });

  it('rejeita respostas vazias como inválidas', async () => {
    const fake = provider(async () => ({ text: '   ', model: 'x' }));
    await expectAppError(new AiService(fake, fakeDb().db, options).generate(params), 502, 'AI_INVALID_RESPONSE');
  });

  it('rejeita respostas anormalmente longas', async () => {
    const fake = provider(async () => ({ text: 'a'.repeat(12001), model: 'x' }));
    await expectAppError(new AiService(fake, fakeDb().db, options).generate(params), 502, 'AI_INVALID_RESPONSE');
  });

  it('trata indisponibilidade e erro de credencial sem expor detalhes internos', async () => {
    const unavailable = provider(async () => {
      throw new LlmProviderError('unavailable', 'detalhe interno', 500);
    });
    await expectAppError(new AiService(unavailable, fakeDb().db, options).generate(params), 503, 'AI_UNAVAILABLE');

    const badKey = provider(async () => {
      throw new LlmProviderError('configuration', 'sk-ant-segredo', 401);
    });
    const error = await new AiService(badKey, fakeDb().db, options).generate(params).catch((err: unknown) => err);
    expect((error as AppError).code).toBe('AI_UNAVAILABLE');
    expect((error as AppError).message).not.toContain('sk-ant');
  });

  it('bloqueia o uso quando a cota diária do usuário foi atingida', async () => {
    const fake = provider(async () => ({ text: 'ok', model: 'x' }));
    await expectAppError(new AiService(fake, fakeDb(3).db, options).generate(params), 429, 'AI_QUOTA_EXCEEDED');
    expect(fake.calls).toHaveLength(0);
  });
});
