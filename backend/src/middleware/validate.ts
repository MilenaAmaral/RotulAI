import type { z } from 'zod';
import { AppError } from '../lib/errors.js';

/**
 * Valida um valor com um schema Zod e lança AppError 400 com detalhes por campo.
 * Usado nos controllers para body, query e params.
 */
export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(raiz)',
      message: issue.message,
    }));
    throw new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos. Verifique os campos informados.', details);
  }
  return result.data;
}
