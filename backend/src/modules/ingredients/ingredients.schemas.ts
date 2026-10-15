import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination.js';

export const ingredientSearchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  curatedOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const ingredientLookupSchema = z.object({
  query: z
    .string({ error: 'Informe o nome do ingrediente.' })
    .trim()
    .min(2, 'Digite pelo menos 2 caracteres.')
    .max(120, 'O nome deve ter no máximo 120 caracteres.'),
});
