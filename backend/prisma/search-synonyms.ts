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
  // Termos leigos: a pessoa descreve a pele, não o produto. As expansões são linhas de produto
  // e ativos conhecidos para cada caso; ajuste pelo painel de administração quando o catálogo mudar.
  ...['pele oleosa', 'oleosa', 'oleosidade'].map((phrase) => ({
    phrase,
    expansions: [
      'antioleosidade',
      'oil control',
      'oil free',
      'oily skin',
      'dry touch',
      'effaclar',
      'normaderm',
      'sebium',
      'cleanance',
      'dermopure',
      'skin clear',
    ],
    category: null,
  })),
  ...['espinhas', 'acneica'].map((phrase) => ({
    phrase,
    expansions: ['acne', 'antiacne', 'effaclar', 'normaderm', 'sebium', 'cleanance', 'dermopure', 'skin clear'],
    category: null,
  })),
  ...['cravos', 'cravo', 'poros', 'poro'].map((phrase) => ({
    phrase,
    expansions: ['salicylic acid', 'comedomed', 'sebium', 'effaclar', 'normaderm'],
    category: null,
  })),
  ...['pele seca', 'ressecada', 'ressecamento'].map((phrase) => ({
    phrase,
    expansions: ['ceramide np', 'hydrating', 'hydro boost', 'hydrance', 'atoderm', 'healing cream', 'moisturizing'],
    category: ProductCategory.HIDRATANTE,
  })),
  ...['pele sensivel', 'sensivel'].map((phrase) => ({
    phrase,
    expansions: ['sensibio', 'toleriane', 'tolerance', 'cicaplast', 'cicalfate', 'gentle', 'eau thermale'],
    category: null,
  })),
  ...['rosacea', 'vermelhidao', 'vermelhidoes'].map((phrase) => ({
    phrase,
    expansions: ['sensibio h2o ar', 'tolerance control', 'toleriane', 'azelaic acid', 'cicalfate'],
    category: null,
  })),
  ...['manchas', 'mancha', 'melasma'].map((phrase) => ({
    phrase,
    expansions: ['vitamin c', 'ascorbic acid', 'azelaic acid', 'tranexamic acid', 'liftactiv'],
    category: null,
  })),
  ...['olheiras', 'olheira', 'olhos'].map((phrase) => ({
    phrase,
    expansions: ['eyes', 'caffeine'],
    category: ProductCategory.OLHOS,
  })),
  ...['rugas', 'antiidade', 'anti idade', 'envelhecimento'].map((phrase) => ({
    phrase,
    expansions: ['retinol', 'liftactiv', 'ageless', 'hyaluronic acid'],
    category: null,
  })),
  {
    phrase: 'acido hialuronico',
    expansions: ['hyaluronic acid', 'sodium hyaluronate'],
    category: null,
  },
];

export const CATALOG_SEARCH_SYNONYMS = definitions.map((item) => ({
  ...item,
  normalizedPhrase: normalizeSearchText(item.phrase),
}));
