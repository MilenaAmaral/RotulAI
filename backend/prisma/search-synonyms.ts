import { ProductCategory } from '../src/generated/prisma/enums.js';
import { normalizeSearchText } from '../src/modules/catalog/search-normalization.js';

const definitions = [
  { phrase: 'serave', expansions: ['cerave'], category: null },
  { phrase: 'la roche', expansions: ['la roche posay'], category: null },
  {
    phrase: 'hidratante',
    expansions: ['moisturizer', 'moisturizing', 'cream', 'hidratacao'],
    category: ProductCategory.HIDRATANTE,
  },
  {
    phrase: 'protetor solar',
    expansions: ['filtro solar', 'sunscreen', 'protetor'],
    category: ProductCategory.PROTETOR_SOLAR,
  },
  {
    phrase: 'filtro solar',
    expansions: ['protetor solar', 'sunscreen', 'protetor'],
    category: ProductCategory.PROTETOR_SOLAR,
  },
  {
    phrase: 'sabonete',
    expansions: ['gel de limpeza', 'facial cleanser', 'cleanser'],
    category: ProductCategory.LIMPEZA,
  },
  {
    phrase: 'gel de limpeza',
    expansions: ['sabonete', 'facial cleanser', 'cleanser'],
    category: ProductCategory.LIMPEZA,
  },
  { phrase: 'espinha', expansions: ['acne'], category: null },
  { phrase: 'acne', expansions: ['espinha'], category: null },
  {
    phrase: 'acido hialuronico',
    expansions: ['hyaluronic acid', 'sodium hyaluronate'],
    category: null,
  },
] as const;

export const CATALOG_SEARCH_SYNONYMS = definitions.map((item) => ({
  ...item,
  normalizedPhrase: normalizeSearchText(item.phrase),
}));
