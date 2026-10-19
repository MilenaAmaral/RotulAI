import { z } from 'zod';
import { ProductCategory } from '../../generated/prisma/enums.js';
import { paginationQuerySchema } from '../../lib/pagination.js';

export const publicProductListQuerySchema = paginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().trim().max(120).optional(),
  category: z.enum(ProductCategory).optional(),
});

export const publicIngredientListQuerySchema = paginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
  q: z.string().trim().max(120).optional(),
  function: z.string().trim().max(80).optional(),
});

export const publicProductSlugSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Identificador inválido.'),
});

export const publicIngredientIdSchema = z.object({
  id: z.uuid({ error: 'Identificador inválido.' }),
});

export type PublicProductListQuery = z.infer<typeof publicProductListQuerySchema>;
export type PublicIngredientListQuery = z.infer<typeof publicIngredientListQuerySchema>;
