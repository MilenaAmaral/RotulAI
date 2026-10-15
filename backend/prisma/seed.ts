import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { normalizeIngredientName } from '../src/modules/ingredients/ingredient-names.js';
import { ANVISA_SOURCE, COSING_SOURCE, DEMO_PRODUCTS, DEMO_USER, INGREDIENTS } from './seed-data.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

async function seedIngredients(): Promise<Map<string, string>> {
  const idsByName = new Map<string, string>();
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
    const ingredient = await prisma.ingredient.upsert({
      where: { normalizedName },
      create: { normalizedName, ...data, sources: { create: sources } },
      update: { ...data, sources: { deleteMany: {}, create: sources } },
    });
    idsByName.set(normalizedName, ingredient.id);
  }
  return idsByName;
}

async function seedDemoUser(idsByName: Map<string, string>): Promise<void> {
  // Recria o usuário de demonstração para manter o seed idempotente.
  await prisma.user.deleteMany({ where: { email: DEMO_USER.email } });
  const user = await prisma.user.create({
    data: {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      passwordHash: await bcrypt.hash(DEMO_USER.password, 12),
    },
  });

  for (const product of DEMO_PRODUCTS) {
    const ingredientIds = product.ingredients.map((name) => {
      const id = idsByName.get(normalizeIngredientName(name));
      if (!id) throw new Error(`Ingrediente de demonstração ausente na base: ${name}`);
      return id;
    });
    await prisma.product.create({
      data: {
        userId: user.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
        ingredients: { create: ingredientIds.map((ingredientId, index) => ({ ingredientId, position: index + 1 })) },
      },
    });
  }
}

async function main() {
  const idsByName = await seedIngredients();
  await seedDemoUser(idsByName);
  console.info(
    `Seed concluído: ${INGREDIENTS.length} ingredientes de referência e ${DEMO_PRODUCTS.length} produtos fictícios.`,
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
