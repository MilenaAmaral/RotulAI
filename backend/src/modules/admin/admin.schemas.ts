import { z } from 'zod';
import { ProductCategory, SkinConcern, SkinType } from '../../generated/prisma/enums.js';

const idSchema = z.uuid({ error: 'Identificador inválido.' });

export const adminProductInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().min(1).max(80),
  category: z.enum(ProductCategory),
  referenceUrl: z.union([z.url(), z.null()]).optional().default(null),
  ingredients: z.array(z.string().trim().min(1).max(120)).min(1).max(100),
});

export const adminIngredientInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  synonyms: z.array(z.string().trim().min(1).max(120)).default([]),
  functions: z.array(z.string().trim().min(1).max(120)).default([]),
  description: z.string().trim().max(2000).nullable().optional().default(null),
  usageInfo: z.string().trim().max(2000).nullable().optional().default(null),
  cautions: z.string().trim().max(2000).nullable().optional().default(null),
  sources: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        publisher: z.string().trim().min(1).max(120),
        url: z.url().max(500),
        note: z.string().trim().max(300).nullable().optional().default(null),
      }),
    )
    .default([]),
});

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
});

export const adminSearchSynonymInputSchema = z.object({
  phrase: z.string().trim().min(2).max(120),
  expansions: z.array(z.string().trim().min(2).max(120)).min(1).max(20),
  category: z.enum(ProductCategory).nullable().optional().default(null),
});

export const adminRecommendationRuleInputSchema = z.object({
  ingredientId: idSchema,
  skinType: z.enum(SkinType),
  concern: z.enum(SkinConcern),
  rationale: z.string().trim().min(5).max(500),
  justification: z.string().trim().min(10).max(1200),
  isActive: z.boolean().default(true),
});

export const idParamSchema = z.object({ id: idSchema });

export type AdminProductInput = z.infer<typeof adminProductInputSchema>;
export type AdminIngredientInput = z.infer<typeof adminIngredientInputSchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminSearchSynonymInput = z.infer<typeof adminSearchSynonymInputSchema>;
export type AdminRecommendationRuleInput = z.infer<typeof adminRecommendationRuleInputSchema>;
