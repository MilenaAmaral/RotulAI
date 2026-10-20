import { z } from 'zod';
import { ProductCategory, SkinConcern, SkinType } from '../../generated/prisma/enums.js';
import { optionalHttpsUrl, requiredHttpsUrl } from '../../lib/schemas.js';

const idSchema = z.uuid({ error: 'Identificador inválido.' });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Texto obrigatório; `label` vem com artigo ("o nome", "a marca") para compor as mensagens. */
const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `Informe ${label}.` })
    .trim()
    .min(min, min === 1 ? `Informe ${label}.` : `${capitalize(label)} deve ter pelo menos ${min} caracteres.`)
    .max(max, `${capitalize(label)} deve ter no máximo ${max} caracteres.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

const textList = (label: string, maxItems: number) =>
  z
    .array(text(label, 1, 120))
    .max(maxItems, `Informe no máximo ${maxItems} itens.`)
    .default([]);

export const adminProductInputSchema = z.object({
  name: text('o nome', 2, 120),
  brand: text('a marca', 1, 80),
  category: z.enum(ProductCategory, { error: 'Selecione uma categoria válida.' }),
  referenceUrl: optionalHttpsUrl('A URL da referência'),
  ingredients: z
    .array(text('o ingrediente', 1, 120), { error: 'Informe a lista de ingredientes.' })
    .min(1, 'Informe ao menos um ingrediente.')
    .max(100, 'A lista pode ter no máximo 100 ingredientes.'),
});

export const adminIngredientInputSchema = z.object({
  name: text('o nome', 2, 120),
  synonyms: textList('o sinônimo', 50),
  functions: textList('a função', 20),
  description: optionalText('A descrição', 2000),
  usageInfo: optionalText('O uso', 2000),
  cautions: optionalText('Os cuidados', 2000),
  sources: z
    .array(
      z.object({
        title: text('o título da fonte', 1, 200),
        publisher: text('o publicador da fonte', 1, 120),
        url: requiredHttpsUrl('A URL da fonte'),
        note: optionalText('A observação', 300),
      }),
    )
    .max(20, 'Informe no máximo 20 fontes.')
    .default([]),
});

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
});

export const adminSearchSynonymInputSchema = z.object({
  phrase: text('a frase', 2, 120),
  expansions: z
    .array(text('a expansão', 2, 120))
    .min(1, 'Informe ao menos uma expansão.')
    .max(20, 'Informe no máximo 20 expansões.'),
  category: z.enum(ProductCategory, { error: 'Selecione uma categoria válida.' }).nullable().optional().default(null),
});

export const adminRecommendationRuleInputSchema = z.object({
  ingredientId: idSchema,
  skinType: z.enum(SkinType, { error: 'Selecione um tipo de pele válido.' }),
  concern: z.enum(SkinConcern, { error: 'Selecione uma preocupação válida.' }),
  rationale: text('o motivo', 5, 500),
  justification: text('a justificativa', 10, 1200),
  isActive: z.boolean().default(true),
});

export const idParamSchema = z.object({ id: idSchema });

export type AdminProductInput = z.infer<typeof adminProductInputSchema>;
export type AdminIngredientInput = z.infer<typeof adminIngredientInputSchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminSearchSynonymInput = z.infer<typeof adminSearchSynonymInputSchema>;
export type AdminRecommendationRuleInput = z.infer<typeof adminRecommendationRuleInputSchema>;
