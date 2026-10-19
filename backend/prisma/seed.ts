import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { normalizeIngredientName } from '../src/modules/ingredients/ingredient-names.js';
import { ANVISA_SOURCE, COSING_SOURCE, INGREDIENTS } from './seed-data.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

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
      update: {},
    });
  }
}

async function main() {
  await seedIngredients();
  console.info(`Seed concluído: ${INGREDIENTS.length} ingredientes de referência.`);
}

main()
  .catch((error: unknown) => {
    console.error('Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
