import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', `Rota ${req.method} ${req.path} não encontrada.`));
}

interface BodyParserError {
  type?: string;
  status?: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return typeof error === 'object' && error !== null && 'type' in error && 'status' in error;
}

/**
 * Converte erros conhecidos do Prisma que dependem de concorrência (ex.: dois cadastros simultâneos
 * com o mesmo e-mail) em respostas HTTP adequadas, em vez de um erro interno genérico.
 */
function fromPrismaError(error: unknown): AppError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  switch (error.code) {
    case 'P2002':
      return new AppError(409, 'CONFLICT', 'Já existe um registro com estes dados.');
    case 'P2025':
      return new AppError(404, 'NOT_FOUND', 'Registro não encontrado.');
    default:
      return null;
  }
}

/** Tratamento central de erros: mensagens seguras para o cliente, detalhes apenas no log. */
export function errorHandler(rawError: unknown, req: Request, res: Response, _next: NextFunction): void {
  const error = fromPrismaError(rawError) ?? rawError;
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ code: error.code, path: req.path }, error.message);
    }
    res.status(error.statusCode).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (isBodyParserError(error)) {
    const tooLarge = error.type === 'entity.too.large';
    res.status(tooLarge ? 413 : 400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: tooLarge ? 'Conteúdo da requisição excede o tamanho permitido.' : 'JSON inválido.',
      },
    });
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ err: { name: err.name, message: err.message, stack: err.stack }, path: req.path }, 'Erro não tratado');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno. Tente novamente mais tarde.' },
  });
}
