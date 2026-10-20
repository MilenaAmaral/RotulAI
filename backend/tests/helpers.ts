import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AccessProfile, type ProductCategory } from '../src/generated/prisma/enums.js';
import { prisma } from '../src/lib/prisma.js';
import { slugify } from '../src/lib/slugify.js';
import { AiService } from '../src/modules/ai/ai.service.js';
import { resolveIngredientIds } from '../src/modules/ingredients/ingredient-resolver.js';
import { productInputSchema } from '../src/modules/products/products.schemas.js';
import type { LlmProvider, LlmRequest, LlmResponse } from '../src/modules/ai/llm-provider.js';

/** Provedor de IA de teste: registra chamadas e devolve a resposta configurada. Usado apenas nos testes. */
export class FakeLlmProvider implements LlmProvider {
  readonly name = 'fake';
  readonly model = 'fake-model';
  calls: LlmRequest[] = [];

  constructor(private readonly handler: (request: LlmRequest) => Promise<LlmResponse>) {}

  generate(request: LlmRequest): Promise<LlmResponse> {
    this.calls.push(request);
    return this.handler(request);
  }
}

export const replyWith = (text: string) => new FakeLlmProvider(async () => ({ text, model: 'fake-model' }));

export function createTestApp(
  provider: LlmProvider | null = null,
  overrides: Partial<{ dailyLimitPerUser: number }> = {},
): Express {
  const ai = new AiService(provider, prisma, {
    timeoutMs: 2000,
    maxOutputTokens: 256,
    maxInputChars: 500,
    dailyLimitPerUser: overrides.dailyLimitPerUser ?? 100,
  });
  return createApp({ ai });
}

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Message", "Conversation", "ProductComparison", "IngredientAnalysis", "Favorite", "CatalogProductIngredient", "CatalogProduct", "CatalogSearchSynonym", "ProductIngredient", "Product", "IngredientSource", "Ingredient", "AiUsageLog", "RefreshToken", "User" CASCADE',
  );
}

let counter = 0;

export interface TestUser {
  id: string;
  email: string;
  password: string;
  token: string;
  cookie: string;
}

export async function registerUser(app: Express, name = 'Pessoa Teste'): Promise<TestUser> {
  counter += 1;
  const email = `teste${counter}-${Date.now()}@exemplo.dev`;
  const password = 'SenhaForte123';
  const response = await request(app).post('/api/auth/register').send({ name, email, password }).expect(201);
  const setCookie = response.headers['set-cookie'] as unknown as string[];
  return {
    id: response.body.user.id,
    email,
    password,
    token: response.body.accessToken,
    cookie: setCookie[0]!.split(';')[0]!,
  };
}

export const validProduct = (overrides: Record<string, unknown> = {}) => ({
  name: 'Sérum de Teste',
  brand: 'Marca Fictícia',
  category: 'SERUM',
  description: 'Produto fictício para testes.',
  ingredients: ['Aqua', 'Glycerin', 'Niacinamide'],
  ...overrides,
});

export async function createProduct(app: Express, user: TestUser, overrides: Record<string, unknown> = {}) {
  const input = productInputSchema.parse(validProduct(overrides));
  const product = await prisma.$transaction(async (tx) => {
    const ingredientIds = await resolveIngredientIds(tx, input.ingredients);
    return tx.product.create({
      data: {
        userId: user.id,
        name: input.name,
        brand: input.brand,
        category: input.category,
        description: input.description,
        imageUrl: input.imageUrl,
        referenceUrl: input.referenceUrl,
        ingredients: {
          create: ingredientIds.map((ingredientId, index) => ({ ingredientId, position: index + 1 })),
        },
      },
      include: { ingredients: { include: { ingredient: { select: { id: true, name: true } } } } },
    });
  });
  const response = await request(app)
    .get(`/api/products/${product.id}`)
    .set('Authorization', `Bearer ${user.token}`)
    .expect(200);
  return response.body as { id: string; ingredients: Array<{ id: string; name: string }> };
}

/** Cria um produto no catálogo público, resolvendo os ingredientes como o painel admin faz. */
export async function createCatalogProduct(
  overrides: Partial<{ name: string; brand: string; category: ProductCategory; ingredients: string[] }> = {},
) {
  counter += 1;
  const name = overrides.name ?? `Produto Público ${counter}`;
  const brand = overrides.brand ?? 'Marca Pública';
  return prisma.$transaction(async (tx) => {
    const ingredientIds = await resolveIngredientIds(tx, overrides.ingredients ?? ['Aqua', 'Glycerin', 'Niacinamide']);
    return tx.catalogProduct.create({
      data: {
        slug: `${slugify(`${brand} ${name}`)}-${counter}`,
        name,
        brand,
        category: overrides.category ?? 'SERUM',
        ingredients: {
          create: ingredientIds.map((ingredientId, index) => ({ ingredientId, position: index + 1 })),
        },
      },
    });
  });
}

export async function promoteUserToAdmin(user: TestUser): Promise<void> {
  await prisma.user.update({ where: { id: user.id }, data: { role: AccessProfile.ADMIN } });
}

export { prisma };
