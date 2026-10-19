import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ProductCategory } from '../src/generated/prisma/enums.js';
import { resolveIngredientIds } from '../src/modules/ingredients/ingredient-resolver.js';
import { CATALOG_SEARCH_SYNONYMS } from './search-synonyms.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const catalogSchema = z.object({
  products: z.array(
    z.object({
      brand: z.string().min(1).max(80),
      name: z.string().min(2).max(120),
      category: z.enum(ProductCategory),
      referenceUrl: z.url(),
      ingredients: z.array(z.string().min(1).max(120)).min(1).max(100),
    }),
  ),
});

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedPublicCatalog(): Promise<number> {
  const file = new URL('./data/catalogo-produtos.json', import.meta.url);
  const catalog = catalogSchema.parse(JSON.parse(readFileSync(file, 'utf8')));

  for (const synonym of CATALOG_SEARCH_SYNONYMS) {
    await prisma.catalogSearchSynonym.upsert({
      where: { normalizedPhrase: synonym.normalizedPhrase },
      create: { ...synonym, expansions: [...synonym.expansions] },
      update: {},
    });
  }

  for (const item of catalog.products) {
    const slug = slugify(`${item.brand} ${item.name}`);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.catalogProduct.findUnique({ where: { slug }, select: { id: true } });
      if (existing) return;

      const ingredientIds = await resolveIngredientIds(tx, item.ingredients);
      const product = await tx.catalogProduct.create({
        data: {
          slug,
          name: item.name,
          brand: item.brand,
          category: item.category,
          referenceUrl: item.referenceUrl,
        },
      });
      await tx.catalogProductIngredient.createMany({
        data: ingredientIds.map((ingredientId, index) => ({
          catalogProductId: product.id,
          ingredientId,
          position: index + 1,
        })),
      });
    });
  }
  return catalog.products.length;
}

seedPublicCatalog()
  .then((count) => console.info(`Catálogo público atualizado com ${count} produtos.`))
  .catch((error: unknown) => {
    console.error('Falha ao carregar o catálogo público:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
