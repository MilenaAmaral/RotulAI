import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CATALOG_SEARCH_SYNONYMS } from '../../prisma/search-synonyms.js';
import { createProduct, createTestApp, prisma, registerUser, resetDatabase } from '../helpers.js';

const app = createTestApp();

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

async function createCatalogFixture() {
  await prisma.catalogSearchSynonym.createMany({
    data: CATALOG_SEARCH_SYNONYMS.map((item) => ({
      ...item,
      expansions: [...item.expansions],
    })),
  });
  const [curated, acneIngredient, hyaluronic, uncurated] = await Promise.all([
    prisma.ingredient.create({
      data: {
        name: 'Glycerin',
        normalizedName: 'glycerin',
        synonyms: ['Glicerina'],
        searchTerms: ['glycerin', 'glicerina'],
        functions: ['Umectante'],
        description: 'Conteúdo educativo de teste.',
        isCurated: true,
        sources: {
          create: [{ title: 'Fonte de teste', publisher: 'Rotulai', url: 'https://example.test/ingredient' }],
        },
      },
    }),
    prisma.ingredient.create({
      data: {
        name: 'Salicylic Acid',
        normalizedName: 'salicylic acid',
        synonyms: ['Ácido salicílico'],
        searchTerms: ['salicylic acid', 'acido salicilico'],
        functions: ['Esfoliante químico'],
        isCurated: true,
      },
    }),
    prisma.ingredient.create({
      data: {
        name: 'Sodium Hyaluronate',
        normalizedName: 'sodium hyaluronate',
        synonyms: ['Ácido hialurônico'],
        searchTerms: ['sodium hyaluronate', 'acido hialuronico', 'hyaluronic acid'],
        functions: ['Umectante'],
        isCurated: true,
      },
    }),
    prisma.ingredient.create({
      data: {
        name: 'Ingredient Without Reference',
        normalizedName: 'ingredient without reference',
        synonyms: [],
        searchTerms: ['ingredient without reference'],
        functions: [],
      },
    }),
  ]);
  const createProduct = (
    slug: string,
    name: string,
    brand: string,
    category: 'HIDRATANTE' | 'LIMPEZA' | 'PROTETOR_SOLAR',
    ingredients: string[],
  ) =>
    prisma.catalogProduct.create({
      data: {
        slug,
        name,
        brand,
        category,
        referenceUrl: 'https://example.test/product',
        ingredients: {
          create: ingredients.map((ingredientId, index) => ({
            position: index + 1,
            ingredient: { connect: { id: ingredientId } },
          })),
        },
      },
    });
  const [product, acneProduct, sunscreenProduct, hyaluronicProduct] = await Promise.all([
    createProduct('cerave-moisturizing-cream', 'CeraVe Moisturizing Cream', 'CeraVe', 'HIDRATANTE', [curated.id]),
    createProduct('cerave-acne-control-cleanser', 'CeraVe Acne Control Cleanser', 'CeraVe', 'LIMPEZA', [
      acneIngredient.id,
    ]),
    createProduct(
      'la-roche-posay-anthelios-fluid',
      'La Roche-Posay Anthelios Invisible Fluid SPF 50+',
      'La Roche-Posay',
      'PROTETOR_SOLAR',
      [],
    ),
    createProduct('cerave-hydrating-facial-cleanser', 'CeraVe Hydrating Facial Cleanser', 'CeraVe', 'LIMPEZA', [
      hyaluronic.id,
      uncurated.id,
    ]),
  ]);
  return { curated, uncurated, product, acneProduct, sunscreenProduct, hyaluronicProduct };
}

describe('catálogo público', () => {
  it('lista e filtra produtos sem exigir autenticação', async () => {
    await createCatalogFixture();

    const response = await request(app).get('/api/catalog/products?q=cerave&category=HIDRATANTE').expect(200);

    expect(response.body).toMatchObject({
      total: 1,
      items: [
        {
          slug: 'cerave-moisturizing-cream',
          name: 'CeraVe Moisturizing Cream',
          ingredientCount: 1,
        },
      ],
    });
  });

  it('detalha somente o produto do catálogo público e conserva a ordem do rótulo', async () => {
    const { hyaluronicProduct: product } = await createCatalogFixture();

    const response = await request(app).get(`/api/catalog/products/${product.slug}`).expect(200);

    expect(response.body).toMatchObject({
      id: product.id,
      referenceUrl: 'https://example.test/product',
      ingredients: [
        { name: 'Sodium Hyaluronate', position: 1, isCurated: true },
        { name: 'Ingredient Without Reference', position: 2, isCurated: false },
      ],
    });
    expect(response.body).not.toHaveProperty('userId');
  });

  it('filtra a busca por ingrediente e função e não publica entradas sem curadoria', async () => {
    const { curated, uncurated } = await createCatalogFixture();

    const response = await request(app).get('/api/catalog/ingredients?q=glicerina&function=Umectante').expect(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ id: curated.id, name: 'Glycerin' });
    expect(response.body.items.some((item: { id: string }) => item.id === uncurated.id)).toBe(false);

    await request(app).get(`/api/catalog/ingredients/${curated.id}`).expect(200);
    await request(app).get(`/api/catalog/ingredients/${uncurated.id}`).expect(404);
  });

  it('mantém o catálogo pessoal protegido por autenticação', async () => {
    await request(app).get('/api/products').expect(401);
    await request(app).get('/api/ingredient-analyses').expect(401);
  });

  it.each([
    { query: 'serave hidratante', expectedSlug: 'cerave-moisturizing-cream' },
    { query: 'hidratante cerave', expectedSlug: 'cerave-moisturizing-cream' },
    { query: 'la roche', expectedSlug: 'la-roche-posay-anthelios-fluid' },
    { query: 'protetor solar oleosa', expectedSlug: 'la-roche-posay-anthelios-fluid' },
    { query: 'sabonete acne', expectedSlug: 'cerave-acne-control-cleanser' },
    { query: 'acido hialuronico', expectedSlug: 'cerave-hydrating-facial-cleanser' },
  ])('encontra $expectedSlug com a consulta "$query"', async ({ query, expectedSlug }) => {
    await createCatalogFixture();

    const response = await request(app).get('/api/catalog/products').query({ q: query }).expect(200);

    expect(response.body.items.map((item: { slug: string }) => item.slug)).toContain(expectedSlug);
  });

  it('sugere produtos próximos quando a consulta tem erros e não há resultado exato', async () => {
    await createCatalogFixture();

    const response = await request(app)
      .get('/api/catalog/products')
      .query({ q: 'ceraeve moiturizing crem' })
      .expect(200);

    expect(response.body.suggestions.map((item: { slug: string }) => item.slug)).toContain('cerave-moisturizing-cream');
  });

  it('usa sinônimos mantidos na tabela sem alterar o código da busca', async () => {
    await createCatalogFixture();
    await prisma.catalogSearchSynonym.create({
      data: {
        phrase: 'creme para ressecamento',
        normalizedPhrase: 'creme para ressecamento',
        expansions: ['moisturizing'],
        category: 'HIDRATANTE',
      },
    });

    const response = await request(app)
      .get('/api/catalog/products')
      .query({ q: 'creme para ressecamento' })
      .expect(200);

    expect(response.body.items[0].slug).toBe('cerave-moisturizing-cream');
  });

  it('mantém equivalência singular/plural, usa palavras inteiras e expande os termos leigos', async () => {
    const { sunscreenProduct } = await createCatalogFixture();
    const niacinamide = await prisma.ingredient.create({
      data: {
        name: 'Niacinamide',
        normalizedName: 'niacinamide',
        synonyms: ['Niacinamida'],
        searchTerms: ['niacinamide', 'niacinamida'],
        functions: ['Condicionante'],
      },
    });
    await Promise.all([
      prisma.catalogProduct.create({
        data: {
          slug: 'retinol-serum-search-test',
          name: 'Retinol Serum',
          brand: 'Vichy',
          category: 'SERUM',
          referenceUrl: 'https://example.test/retinol',
        },
      }),
      prisma.catalogProduct.create({
        data: {
          slug: 'solution-serum-search-test',
          name: 'Solution Serum',
          brand: 'Vichy',
          category: 'SERUM',
          referenceUrl: 'https://example.test/solution',
        },
      }),
      prisma.catalogProduct.create({
        data: {
          slug: 'avene-cicalfate-search-test',
          name: 'Cicalfate Restorative Cream',
          brand: 'Avène',
          category: 'HIDRATANTE',
          referenceUrl: 'https://example.test/cicalfate',
        },
      }),
      prisma.catalogProduct.create({
        data: {
          slug: 'niacinamide-serum-search-test',
          name: 'Niacinamide Serum',
          brand: 'Vichy',
          category: 'SERUM',
          referenceUrl: 'https://example.test/niacinamide',
          ingredients: {
            create: [{ position: 1, ingredient: { connect: { id: niacinamide.id } } }],
          },
        },
      }),
      prisma.catalogSearchSynonym.create({
        data: { phrase: 'coceira', normalizedPhrase: 'coceira', expansions: ['cleanser'], category: null },
      }),
    ]);

    const total = async (q: string) => {
      const response = await request(app).get('/api/catalog/products').query({ q }).expect(200);
      return response.body.total as number;
    };
    const result = async (q: string) => {
      const response = await request(app).get('/api/catalog/products').query({ q }).expect(200);
      return response.body as { total: number; items: Array<{ slug: string }> };
    };
    const rugaTotal = await total('ruga');

    expect(rugaTotal).toBeGreaterThan(0);
    expect(await total('rugas')).toBe(rugaTotal);
    expect(await total('espinha')).toBe(await total('espinhas'));
    expect(await total('espina')).toBe(await total('espinha'));
    expect(await total('protetor')).toBe(await total('protetor solar'));
    expect(await total('linhas de expressão')).toBeGreaterThan(0);
    expect(await total('cicatriz')).toBeGreaterThan(0);
    expect(await total('marcas de espinha')).toBeGreaterThan(0);
    expect(await total('coceira')).toBe(0);
    expect(await total('avene')).toBeGreaterThan(0);
    expect(await total('cicalfate')).toBeGreaterThan(0);
    expect(await total('niacinamida')).toBeGreaterThan(0);

    const sunSpots = await result('mancha de sol');
    expect(sunSpots.total).toBeLessThan(89);
    expect(sunSpots.items.map((item) => item.slug)).toContain(sunscreenProduct.slug);
    expect((await result('sol')).items.map((item) => item.slug)).not.toContain('solution-serum-search-test');
  });

  it('não mistura produtos pessoais nos resultados públicos', async () => {
    const user = await registerUser(app);
    await createProduct(app, user, { name: 'Produto Privado Exclusivo', brand: 'Marca da Pessoa' });

    const response = await request(app)
      .get('/api/catalog/products')
      .query({ q: 'Produto Privado Exclusivo' })
      .expect(200);

    expect(response.body.total).toBe(0);
  });
});
