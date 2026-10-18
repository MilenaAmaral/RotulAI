import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ProductCategory } from '../src/generated/prisma/enums.js';
import { normalizeIngredientName } from '../src/modules/ingredients/ingredient-names.js';
import { resolveIngredientIds } from '../src/modules/ingredients/ingredient-resolver.js';
import { ANVISA_SOURCE, COSING_SOURCE, DEMO_USER, INGREDIENTS } from './seed-data.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const catalogSchema = z.object({
  source: z.string(),
  retrievedAt: z.string(),
  products: z
    .array(
      z.object({
        brand: z.string().min(1).max(80),
        name: z.string().min(2).max(120),
        category: z.enum(ProductCategory),
        referenceUrl: z.url(),
        ingredients: z.array(z.string().min(1).max(120)).min(1).max(100),
      }),
    )
    .min(1),
});

const CATEGORY_DESCRIPTIONS: Record<ProductCategory, string> = {
  LIMPEZA: 'Produto de limpeza facial.',
  TONICO: 'Tônico ou bruma facial.',
  SERUM: 'Sérum facial.',
  HIDRATANTE: 'Hidratante.',
  PROTETOR_SOLAR: 'Protetor solar.',
  ESFOLIANTE: 'Esfoliante.',
  MASCARA: 'Máscara facial.',
  OLHOS: 'Produto para a área dos olhos.',
  LABIOS: 'Produto para os lábios.',
  TRATAMENTO: 'Tratamento de uso tópico.',
  OUTRO: 'Produto de cuidados com a pele.',
};

function loadCatalog() {
  const file = new URL('./data/catalogo-produtos.json', import.meta.url);
  return catalogSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

async function seedIngredients(): Promise<void> {
  for (const item of INGREDIENTS) {
    const normalizedName = normalizeIngredientName(item.name);
    const searchTerms = [...new Set([normalizedName, ...item.synonyms.map(normalizeIngredientName)])];
    const data = {
      name: item.name,
      synonyms: item.synonyms,
      searchTerms,
      functions: item.functions,
      description: item.description,
      usageInfo: item.usageInfo,
      cautions: item.cautions,
      isCurated: true,
    };
    const sources = item.regulated ? [COSING_SOURCE, ANVISA_SOURCE] : [COSING_SOURCE];
    await prisma.ingredient.upsert({
      where: { normalizedName },
      create: { normalizedName, ...data, sources: { create: sources } },
      update: { ...data, sources: { deleteMany: {}, create: sources } },
    });
  }
}

async function seedDemoCatalog(): Promise<number> {
  const catalog = loadCatalog();

  // Recria o usuário de demonstração para manter o seed idempotente.
  await prisma.user.deleteMany({ where: { email: DEMO_USER.email } });
  const user = await prisma.user.create({
    data: {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      passwordHash: await bcrypt.hash(DEMO_USER.password, 12),
    },
  });

  const retrievedAt = new Date(`${catalog.retrievedAt}T12:00:00Z`).toLocaleDateString('pt-BR');
  for (const product of catalog.products) {
    await prisma.$transaction(async (tx) => {
      const ingredientIds = await resolveIngredientIds(tx, product.ingredients);
      await tx.product.create({
        data: {
          userId: user.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          description: `${CATEGORY_DESCRIPTIONS[product.category]} Lista de ingredientes conforme ${catalog.source}, consultada em ${retrievedAt}.`,
          referenceUrl: product.referenceUrl,
          ingredients: {
            create: ingredientIds.map((ingredientId, index) => ({ ingredientId, position: index + 1 })),
          },
        },
      });
    });
  }
  return catalog.products.length;
}

async function main() {
  await seedIngredients();
  const products = await seedDemoCatalog();
  console.info(
    `Seed concluído: ${INGREDIENTS.length} ingredientes de referência e ${products} produtos no catálogo de demonstração.`,
  );
  console.info(`Acesso de demonstração (fictício): ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

main()
  .catch((error: unknown) => {
    console.error('Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
