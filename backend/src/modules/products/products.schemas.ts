import { z } from 'zod';
import { ProductCategory } from '../../generated/prisma/enums.js';
import { paginationQuerySchema } from '../../lib/pagination.js';

export const PRODUCT_CATEGORIES = Object.values(ProductCategory);

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const productInputSchema = z.object({
  name: z
    .string({ error: 'Informe o nome do produto.' })
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(120, 'O nome deve ter no máximo 120 caracteres.'),
  brand: z
    .string({ error: 'Informe a marca.' })
    .trim()
    .min(1, 'Informe a marca.')
    .max(80, 'A marca deve ter no máximo 80 caracteres.'),
  category: z.enum(ProductCategory, { error: 'Selecione uma categoria válida.' }),
  description: optionalText(2000, 'A descrição deve ter no máximo 2000 caracteres.'),
  imageUrl: z
    .string()
    .trim()
    .max(500, 'A URL da imagem deve ter no máximo 500 caracteres.')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^https:\/\/[^\s]+$/i.test(value), {
      message: 'A imagem deve ser uma URL iniciada por https://',
    }),
  referenceUrl: z
    .string()
    .trim()
    .max(500, 'O link da fonte deve ter no máximo 500 caracteres.')
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^https:\/\/[^\s]+$/i.test(value), {
      message: 'O link da fonte deve começar com https://',
    }),
  ingredients: z
    .array(
      z.string().trim().min(1, 'Ingrediente vazio.').max(120, 'Cada ingrediente deve ter no máximo 120 caracteres.'),
      { error: 'Informe a lista de ingredientes.' },
    )
    .min(1, 'Informe ao menos um ingrediente.')
    .max(100, 'A lista pode ter no máximo 100 ingredientes.'),
});

export const productListQuerySchema = paginationQuerySchema.extend({
  // O catálogo aceita páginas maiores para alimentar seletores (comparador e assistente).
  pageSize: z.coerce.number().int().min(1).max(200).default(12),
  q: z.string().trim().max(120).optional(),
  category: z.enum(ProductCategory).optional(),
});

export const idParamSchema = z.object({
  id: z.uuid({ error: 'Identificador inválido.' }),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
