import { z } from 'zod';
import { parseIngredientText } from '../../lib/ingredients';
import type { ProductCategory, ProductInput } from '../../types/api';

const categories = [
  'LIMPEZA',
  'TONICO',
  'SERUM',
  'HIDRATANTE',
  'PROTETOR_SOLAR',
  'ESFOLIANTE',
  'MASCARA',
  'OLHOS',
  'LABIOS',
  'OUTRO',
] as const satisfies readonly ProductCategory[];

/** Espelha as regras do back-end para dar retorno imediato; o servidor continua validando. */
export const productFormSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(120, 'Máximo de 120 caracteres.'),
  brand: z.string().trim().min(1, 'Informe a marca.').max(80, 'Máximo de 80 caracteres.'),
  category: z.enum(categories, { error: 'Selecione uma categoria.' }),
  description: z.string().trim().max(2000, 'Máximo de 2000 caracteres.'),
  imageUrl: z
    .string()
    .trim()
    .max(500, 'Máximo de 500 caracteres.')
    .refine((value) => value === '' || /^https:\/\/\S+$/i.test(value), 'Use um endereço iniciado por https://'),
  ingredientsText: z.string().superRefine((value, ctx) => {
    const items = parseIngredientText(value);
    if (items.length === 0) ctx.addIssue({ code: 'custom', message: 'Informe ao menos um ingrediente.' });
    if (items.length > 100) ctx.addIssue({ code: 'custom', message: 'A lista pode ter no máximo 100 ingredientes.' });
    const tooLong = items.find((item) => item.length > 120);
    if (tooLong) ctx.addIssue({ code: 'custom', message: `Ingrediente muito longo: "${tooLong.slice(0, 30)}..."` });
  }),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const emptyProductForm: ProductFormValues = {
  name: '',
  brand: '',
  category: 'SERUM',
  description: '',
  imageUrl: '',
  ingredientsText: '',
};

export function toProductInput(values: ProductFormValues): ProductInput {
  return {
    name: values.name.trim(),
    brand: values.brand.trim(),
    category: values.category,
    description: values.description.trim() || null,
    imageUrl: values.imageUrl.trim() || null,
    ingredients: parseIngredientText(values.ingredientsText),
  };
}
