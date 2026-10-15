/**
 * Dados de demonstração do SkinAI.
 *
 * - O usuário e os produtos são FICTÍCIOS (marcas inventadas, sem dados pessoais reais).
 * - Os textos dos ingredientes são resumos educacionais escritos para o projeto. As fontes
 *   listadas são bases públicas para VERIFICAÇÃO do nome INCI, funções e restrições; elas não
 *   são citadas como origem literal dos textos.
 */
import type { ProductCategory } from '../src/generated/prisma/enums.js';

export interface SeedSource {
  title: string;
  publisher: string;
  url: string;
  note: string;
}

export interface SeedIngredient {
  name: string;
  synonyms: string[];
  functions: string[];
  description: string;
  usageInfo: string;
  cautions: string;
  regulated?: boolean;
}

export const COSING_SOURCE: SeedSource = {
  title: 'CosIng: base de dados de ingredientes cosméticos',
  publisher: 'Comissão Europeia',
  url: 'https://ec.europa.eu/growth/tools-databases/cosing/',
  note: 'Pesquise pelo nome INCI para conferir funções registradas e restrições na União Europeia.',
};

export const ANVISA_SOURCE: SeedSource = {
  title: 'Cosméticos: regulamentação e orientações',
  publisher: 'Agência Nacional de Vigilância Sanitária (Anvisa)',
  url: 'https://www.gov.br/anvisa/pt-br/assuntos/cosmeticos',
  note: 'Ingrediente com uso regulado (lista de substâncias permitidas, limites ou advertências). Consulte as normas vigentes no Brasil.',
};

const PATCH_TEST =
  'Ao introduzir um produto novo, um teste de contato em pequena área pode ajudar a identificar sensibilidade individual.';

export const INGREDIENTS: SeedIngredient[] = [
  {
    name: 'Aqua',
    synonyms: ['Water', 'Água'],
    functions: ['Solvente'],
    description: 'Água purificada. É a base da maioria das formulações e dissolve outros ingredientes.',
    usageInfo: 'Aparece em géis, cremes, loções, tônicos e sabonetes líquidos, geralmente no início da lista.',
    cautions: 'Fórmulas com água precisam de sistema conservante para evitar contaminação microbiológica.',
  },
  {
    name: 'Glycerin',
    synonyms: ['Glicerina', 'Glycerol', 'Glicerol'],
    functions: ['Umectante', 'Condicionante da pele'],
    description: 'Umectante que atrai água para as camadas superficiais da pele, ajudando na sensação de hidratação.',
    usageInfo: 'Muito comum em hidratantes, séruns, sabonetes e tônicos.',
    cautions: `Costuma ser bem tolerada, mas nenhuma substância é isenta de reações individuais. ${PATCH_TEST}`,
  },
  {
    name: 'Niacinamide',
    synonyms: ['Niacinamida', 'Nicotinamide', 'Nicotinamida', 'Vitamin B3', 'Vitamina B3'],
    functions: ['Condicionante da pele'],
    description: 'Forma da vitamina B3 usada em cosméticos como condicionante da pele.',
    usageInfo:
      'Presente em séruns, hidratantes e tônicos; é frequentemente associada a cuidados com oleosidade e uniformidade do tom.',
    cautions: `Algumas pessoas relatam vermelhidão ou ardência, sobretudo em concentrações mais altas. ${PATCH_TEST}`,
  },
  {
    name: 'Sodium Hyaluronate',
    synonyms: ['Hialuronato de sódio', 'Hialuronato de sodio'],
    functions: ['Umectante', 'Condicionante da pele'],
    description:
      'Sal do ácido hialurônico. Retém água na superfície da pele e contribui para a sensação de hidratação.',
    usageInfo: 'Comum em séruns, hidratantes e produtos para a área dos olhos.',
    cautions: 'Em ambientes muito secos, costuma ser combinado com emolientes para reduzir a perda de água.',
  },
  {
    name: 'Hyaluronic Acid',
    synonyms: ['Ácido hialurônico', 'Acido hialuronico'],
    functions: ['Umectante', 'Condicionante da pele'],
    description: 'Polissacarídeo com alta capacidade de retenção de água, usado para hidratação superficial.',
    usageInfo: 'Aparece em séruns e hidratantes, muitas vezes junto do hialuronato de sódio.',
    cautions: `A tolerância é geralmente boa, mas a resposta é individual. ${PATCH_TEST}`,
  },
  {
    name: 'Salicylic Acid',
    synonyms: ['Ácido salicílico', 'Acido salicilico', 'BHA'],
    functions: ['Esfoliante químico', 'Conservante'],
    description: 'Beta-hidroxiácido (BHA) lipossolúvel que promove esfoliação química superficial.',
    usageInfo: 'Comum em sabonetes, tônicos e séruns voltados a pele oleosa ou com tendência a cravos.',
    cautions:
      'Pode causar ressecamento e irritação. Concentrações e usos são regulados e variam por país. Pessoas com alergia a salicilatos, gestantes e lactantes devem buscar orientação profissional.',
    regulated: true,
  },
  {
    name: 'Retinol',
    synonyms: ['Vitamina A', 'Vitamin A'],
    functions: ['Condicionante da pele'],
    description: 'Forma da vitamina A usada em cosméticos para renovação e textura da pele.',
    usageInfo: 'Presente em séruns e cremes de uso geralmente noturno, com introdução gradual.',
    cautions:
      'Pode causar irritação, descamação e sensibilidade ao sol; uso de protetor solar é recomendado. Gestantes e lactantes devem consultar um médico antes do uso. Seu uso tem restrições regulatórias em alguns países.',
    regulated: true,
  },
  {
    name: 'Ascorbic Acid',
    synonyms: ['Ácido ascórbico', 'Acido ascorbico', 'Vitamina C', 'Vitamin C', 'L-Ascorbic Acid'],
    functions: ['Antioxidante'],
    description: 'Forma pura da vitamina C, utilizada como antioxidante em fórmulas cosméticas.',
    usageInfo: 'Comum em séruns de uso diurno, frequentemente combinada com protetor solar na rotina.',
    cautions:
      'É instável na presença de luz, ar e calor; mudanças de cor podem indicar oxidação. Pode causar ardência em peles sensíveis.',
  },
  {
    name: 'Tocopherol',
    synonyms: ['Vitamina E', 'Vitamin E', 'Tocoferol'],
    functions: ['Antioxidante', 'Condicionante da pele'],
    description: 'Vitamina E. Atua como antioxidante, protegendo a própria fórmula da oxidação, e como condicionante.',
    usageInfo: 'Aparece em óleos, cremes, protetores labiais e séruns.',
    cautions: `Há relatos de dermatite de contato em pessoas sensíveis. ${PATCH_TEST}`,
  },
  {
    name: 'Panthenol',
    synonyms: ['D-Panthenol', 'Pantenol', 'Dexpantenol', 'Pró-vitamina B5', 'Provitamin B5'],
    functions: ['Condicionante da pele', 'Umectante'],
    description: 'Pró-vitamina B5 com ação umectante e condicionante, associada à sensação de conforto da pele.',
    usageInfo: 'Comum em hidratantes, produtos pós-sol e cuidados com a barreira cutânea.',
    cautions: `Geralmente bem tolerado; reações são incomuns, mas possíveis. ${PATCH_TEST}`,
  },
  {
    name: 'Ceramide NP',
    synonyms: ['Ceramida NP', 'Ceramide 3', 'Ceramida 3'],
    functions: ['Condicionante da pele'],
    description: 'Ceramida semelhante aos lipídios naturais da camada mais externa da pele.',
    usageInfo:
      'Presente em hidratantes e produtos para reforço da barreira cutânea, muitas vezes com colesterol e ácidos graxos.',
    cautions: 'A eficácia depende da formulação completa; a presença no rótulo não indica concentração.',
  },
  {
    name: 'Zinc Oxide',
    synonyms: ['Óxido de zinco', 'Oxido de zinco', 'CI 77947'],
    functions: ['Filtro UV', 'Opacificante'],
    description: 'Filtro solar inorgânico (mineral) que reflete e absorve parte da radiação ultravioleta.',
    usageInfo: 'Comum em protetores solares minerais e produtos infantis.',
    cautions:
      'Pode deixar aspecto esbranquiçado. Filtros UV têm uso e concentração regulados; a proteção depende da fórmula e da quantidade aplicada.',
    regulated: true,
  },
  {
    name: 'Titanium Dioxide',
    synonyms: ['Dióxido de titânio', 'Dioxido de titanio', 'CI 77891'],
    functions: ['Filtro UV', 'Opacificante', 'Corante'],
    description: 'Pigmento mineral usado como filtro UV e para conferir cor branca e opacidade.',
    usageInfo: 'Aparece em protetores solares, bases e maquiagens.',
    cautions:
      'Uso regulado como filtro UV e corante; restrições variam por forma (por exemplo, em pó ou spray) e por país.',
    regulated: true,
  },
  {
    name: 'Butylene Glycol',
    synonyms: ['Butilenoglicol', 'Butilene glicol', '1,3-Butanediol'],
    functions: ['Umectante', 'Solvente'],
    description: 'Glicol usado como umectante e para dissolver outros ingredientes, como extratos vegetais.',
    usageInfo: 'Comum em tônicos, séruns e essências.',
    cautions: PATCH_TEST,
  },
  {
    name: 'Phenoxyethanol',
    synonyms: ['Fenoxietanol'],
    functions: ['Conservante'],
    description: 'Conservante que ajuda a evitar o crescimento de micro-organismos na fórmula.',
    usageInfo: 'Muito comum em cremes, loções e produtos à base de água.',
    cautions: 'Tem concentração máxima regulada. Pode causar irritação em pessoas sensíveis.',
    regulated: true,
  },
  {
    name: 'Parfum',
    synonyms: ['Fragrance', 'Fragrância', 'Fragrancia', 'Perfume'],
    functions: ['Fragrância'],
    description: 'Termo que agrupa a composição aromática do produto, que pode reunir diversas substâncias.',
    usageInfo: 'Presente em grande parte dos cosméticos perfumados.',
    cautions:
      'Fragrâncias estão entre causas conhecidas de dermatite de contato alérgica. Pessoas com pele sensível ou alergia conhecida podem preferir produtos sem fragrância.',
  },
  {
    name: 'Allantoin',
    synonyms: ['Alantoína', 'Alantoina'],
    functions: ['Condicionante da pele'],
    description: 'Ingrediente condicionante associado à sensação calmante e de suavidade da pele.',
    usageInfo: 'Comum em hidratantes, pós-barba e produtos para pele sensível.',
    cautions: PATCH_TEST,
  },
  {
    name: 'Squalane',
    synonyms: ['Esqualano'],
    functions: ['Emoliente', 'Condicionante da pele'],
    description: 'Óleo leve e estável que ajuda a suavizar a pele e reduzir a perda de água.',
    usageInfo: 'Aparece em óleos faciais, hidratantes e produtos capilares.',
    cautions: 'Pode ser de origem vegetal, sintética ou animal; a origem nem sempre consta no rótulo.',
  },
  {
    name: 'Lactic Acid',
    synonyms: ['Ácido lático', 'Acido latico', 'Ácido láctico', 'AHA'],
    functions: ['Esfoliante químico', 'Umectante', 'Regulador de pH'],
    description: 'Alfa-hidroxiácido (AHA) que promove esfoliação química suave e também atua como umectante.',
    usageInfo:
      'Presente em tônicos, séruns e hidratantes; em pequenas quantidades, pode servir apenas para ajustar o pH.',
    cautions:
      'AHAs podem aumentar a sensibilidade ao sol; protetor solar é recomendado. Pode causar ardência e irritação.',
    regulated: true,
  },
  {
    name: 'Glycolic Acid',
    synonyms: ['Ácido glicólico', 'Acido glicolico'],
    functions: ['Esfoliante químico', 'Regulador de pH'],
    description: 'Alfa-hidroxiácido (AHA) de molécula pequena, usado para esfoliação química.',
    usageInfo: 'Comum em tônicos e séruns esfoliantes de uso noturno.',
    cautions:
      'Pode causar irritação e aumentar a sensibilidade ao sol. Concentrações e pH são regulados em vários países.',
    regulated: true,
  },
  {
    name: 'Centella Asiatica Extract',
    synonyms: ['Extrato de centella asiática', 'Centella asiatica', 'Cica'],
    functions: ['Condicionante da pele'],
    description: 'Extrato vegetal tradicionalmente associado a produtos calmantes e de cuidado com a barreira.',
    usageInfo: 'Presente em cremes, séruns e máscaras voltados a peles sensíveis.',
    cautions: `Extratos vegetais podem provocar alergia em pessoas predispostas. ${PATCH_TEST}`,
  },
  {
    name: 'Dimethicone',
    synonyms: ['Dimeticona'],
    functions: ['Emoliente', 'Formador de filme'],
    description: 'Silicone que forma uma película leve, deixando toque sedoso e reduzindo a perda de água.',
    usageInfo: 'Comum em hidratantes, primers, protetores solares e produtos capilares.',
    cautions:
      'A sensação na pele varia conforme a fórmula. Não há garantia de que seja adequado a todos os tipos de pele.',
  },
  {
    name: 'Cetearyl Alcohol',
    synonyms: ['Álcool cetoestearílico', 'Alcool cetoestearilico', 'Cetostearyl Alcohol'],
    functions: ['Emoliente', 'Emulsionante', 'Espessante'],
    description: 'Álcool graxo usado para dar corpo e estabilidade a cremes. É diferente do álcool etílico.',
    usageInfo: 'Presente em cremes, loções e condicionadores.',
    cautions: PATCH_TEST,
  },
  {
    name: 'Alcohol Denat.',
    synonyms: ['Álcool desnaturado', 'Alcool desnaturado', 'Denatured Alcohol', 'SD Alcohol'],
    functions: ['Solvente', 'Adstringente'],
    description:
      'Álcool etílico com aditivos que impedem o consumo. Ajuda na secagem rápida e na sensação refrescante.',
    usageInfo: 'Comum em tônicos, protetores solares de toque seco e produtos para pele oleosa.',
    cautions:
      'Em quantidades altas, pode ressecar ou irritar a pele, especialmente se sensível ou com barreira comprometida.',
  },
  {
    name: 'Ethylhexylglycerin',
    synonyms: ['Etil-hexilglicerina', 'Etilhexilglicerina'],
    functions: ['Condicionante da pele', 'Auxiliar de conservação'],
    description: 'Ingrediente condicionante frequentemente usado para reforçar o sistema conservante.',
    usageInfo: 'Costuma aparecer junto ao fenoxietanol em cremes e loções.',
    cautions: PATCH_TEST,
  },
  {
    name: 'Xanthan Gum',
    synonyms: ['Goma xantana'],
    functions: ['Espessante', 'Estabilizante'],
    description: 'Polissacarídeo obtido por fermentação, usado para dar textura de gel e estabilizar fórmulas.',
    usageInfo: 'Presente em géis, séruns e loções.',
    cautions: 'Normalmente usado em baixas quantidades; reações são incomuns.',
  },
  {
    name: 'Sodium Laureth Sulfate',
    synonyms: ['Lauril éter sulfato de sódio', 'Lauril eter sulfato de sodio', 'SLES'],
    functions: ['Tensoativo de limpeza', 'Espumante'],
    description: 'Tensoativo que remove oleosidade e sujeira e gera espuma.',
    usageInfo: 'Comum em sabonetes líquidos, xampus e géis de limpeza.',
    cautions: 'Pode ressecar ou irritar algumas peles, dependendo da concentração e da fórmula completa.',
  },
  {
    name: 'Caffeine',
    synonyms: ['Cafeína', 'Cafeina'],
    functions: ['Condicionante da pele'],
    description: 'Ingrediente condicionante frequentemente usado em produtos para a área dos olhos.',
    usageInfo: 'Presente em cremes e séruns para olhos e em alguns tônicos.',
    cautions:
      'Resultados variam entre pessoas e formulações; não substitui avaliação profissional de olheiras ou inchaço.',
  },
  {
    name: 'Bisabolol',
    synonyms: ['Alfa-bisabolol', 'Alpha-Bisabolol'],
    functions: ['Condicionante da pele'],
    description: 'Componente presente na camomila, usado como condicionante associado à sensação calmante.',
    usageInfo: 'Comum em produtos para pele sensível e pós-sol.',
    cautions: `Pessoas com alergia a plantas da família da camomila devem ter atenção. ${PATCH_TEST}`,
  },
  {
    name: 'Urea',
    synonyms: ['Ureia', 'Uréia', 'Carbamide'],
    functions: ['Umectante', 'Condicionante da pele'],
    description:
      'Umectante presente naturalmente na pele; em concentrações maiores, também auxilia na suavização de áreas ásperas.',
    usageInfo: 'Comum em hidratantes corporais e para pés e mãos.',
    cautions: 'Pode causar ardência em pele com fissuras ou sensível, especialmente em concentrações mais altas.',
  },
];

export interface SeedProduct {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  ingredients: string[];
}

export const DEMO_USER = {
  name: 'Usuária Demonstração',
  email: 'demo@skinai.dev',
  password: 'Demo@12345',
};

/** Produtos e marcas fictícios, criados apenas para demonstração. */
export const DEMO_PRODUCTS: SeedProduct[] = [
  {
    name: 'Gel de Limpeza Equilíbrio',
    brand: 'Aurora Lab (fictícia)',
    category: 'LIMPEZA',
    description: 'Produto fictício de demonstração. Gel de limpeza facial para uso diário.',
    ingredients: [
      'Aqua',
      'Sodium Laureth Sulfate',
      'Glycerin',
      'Salicylic Acid',
      'Niacinamide',
      'Xanthan Gum',
      'Phenoxyethanol',
      'Parfum',
    ],
  },
  {
    name: 'Sérum Hidratante Orvalho',
    brand: 'Aurora Lab (fictícia)',
    category: 'SERUM',
    description: 'Produto fictício de demonstração. Sérum leve com foco em hidratação.',
    ingredients: [
      'Aqua',
      'Glycerin',
      'Sodium Hyaluronate',
      'Hyaluronic Acid',
      'Panthenol',
      'Allantoin',
      'Butylene Glycol',
      'Phenoxyethanol',
      'Ethylhexylglycerin',
    ],
  },
  {
    name: 'Sérum Uniformizador B3',
    brand: 'Brisa Dermocosméticos (fictícia)',
    category: 'SERUM',
    description: 'Produto fictício de demonstração. Sérum com niacinamida.',
    ingredients: [
      'Aqua',
      'Niacinamide',
      'Glycerin',
      'Butylene Glycol',
      'Sodium Hyaluronate',
      'Xanthan Gum',
      'Phenoxyethanol',
      'Ethylhexylglycerin',
    ],
  },
  {
    name: 'Creme Barreira Nutritivo',
    brand: 'Brisa Dermocosméticos (fictícia)',
    category: 'HIDRATANTE',
    description: 'Produto fictício de demonstração. Creme hidratante de textura média.',
    ingredients: [
      'Aqua',
      'Glycerin',
      'Cetearyl Alcohol',
      'Squalane',
      'Dimethicone',
      'Ceramide NP',
      'Panthenol',
      'Tocopherol',
      'Bisabolol',
      'Phenoxyethanol',
    ],
  },
  {
    name: 'Protetor Solar Mineral Diário',
    brand: 'Aurora Lab (fictícia)',
    category: 'PROTETOR_SOLAR',
    description:
      'Produto fictício de demonstração. O fator de proteção não é informado por se tratar de item fictício.',
    ingredients: ['Aqua', 'Zinc Oxide', 'Titanium Dioxide', 'Dimethicone', 'Glycerin', 'Tocopherol', 'Phenoxyethanol'],
  },
];
