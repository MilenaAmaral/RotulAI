import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client.js';
import { AppError } from '../../src/lib/errors.js';
import { errorHandler } from '../../src/middleware/error-handler.js';

function runHandler(error: unknown) {
  const captured: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      return this;
    },
  } as unknown as Response;
  errorHandler(error, { path: '/teste' } as Request, res, () => undefined);
  return captured;
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('detalhe interno do banco', { code, clientVersion: 'teste' });

describe('errorHandler', () => {
  it('mantém status, código e detalhes de um AppError', () => {
    const result = runHandler(
      new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos.', [{ field: 'a', message: 'b' }]),
    );
    expect(result).toEqual({
      status: 400,
      body: {
        error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: [{ field: 'a', message: 'b' }] },
      },
    });
  });

  it('converte violação de unicidade do Prisma (P2002) em 409 sem expor a mensagem do banco', () => {
    const result = runHandler(prismaError('P2002'));
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(JSON.stringify(result.body)).not.toContain('detalhe interno');
  });

  it('converte registro inexistente do Prisma (P2025) em 404', () => {
    expect(runHandler(prismaError('P2025'))).toMatchObject({ status: 404, body: { error: { code: 'NOT_FOUND' } } });
  });

  it('responde 500 genérico para erros desconhecidos, inclusive outros códigos do Prisma', () => {
    for (const error of [new Error('falha secreta'), prismaError('P1001')]) {
      const result = runHandler(error);
      expect(result.status).toBe(500);
      expect(result.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno. Tente novamente mais tarde.' },
      });
    }
  });

  it('diferencia JSON malformado (400) de corpo grande demais (413)', () => {
    expect(runHandler({ type: 'entity.parse.failed', status: 400 }).status).toBe(400);
    expect(runHandler({ type: 'entity.too.large', status: 413 }).status).toBe(413);
  });
});
