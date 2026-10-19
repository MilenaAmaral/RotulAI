import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { normalizeIngredientName } from '../src/modules/ingredients/ingredient-names.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

function productKey(product: {
  brand: string;
  name: string;
  ingredients: Array<{ position: number; ingredient: { normalizedName: string } }>;
}): string {
  return JSON.stringify([
    normalizeIngredientName(product.brand),
    normalizeIngredientName(product.name),
    product.ingredients.map(({ position, ingredient }) => [position, ingredient.normalizedName]),
  ]);
}

async function migratePersonalProducts(): Promise<void> {
  const catalogCount = await prisma.catalogProduct.count();
  if (catalogCount === 0) {
    throw new Error('O catálogo público está vazio. Carregue e revise o catálogo antes de migrar favoritos.');
  }

  const [personalProducts, catalogProducts] = await Promise.all([
    prisma.product.findMany({
      include: {
        ingredients: {
          orderBy: { position: 'asc' },
          include: { ingredient: { select: { normalizedName: true } } },
        },
      },
    }),
    prisma.catalogProduct.findMany({
      include: {
        ingredients: {
          orderBy: { position: 'asc' },
          include: { ingredient: { select: { normalizedName: true } } },
        },
      },
    }),
  ]);

  const catalogByKey = new Map(catalogProducts.map((product) => [productKey(product), product.id]));
  const favorites = new Map<string, { userId: string; catalogProductId: string }>();
  let unmatched = 0;

  for (const product of personalProducts) {
    const catalogProductId = catalogByKey.get(productKey(product));
    if (!catalogProductId) {
      unmatched += 1;
      continue;
    }
    favorites.set(`${product.userId}:${catalogProductId}`, { userId: product.userId, catalogProductId });
  }

  const rows = [...favorites.values()];
  for (let offset = 0; offset < rows.length; offset += 500) {
    await prisma.favorite.createMany({ data: rows.slice(offset, offset + 500), skipDuplicates: true });
  }

  console.info(
    `Migração concluída sem excluir dados: ${rows.length} favoritos correspondentes; ${unmatched} registros permanecem no arquivo privado.`,
  );
}

void migratePersonalProducts()
  .catch((error: unknown) => {
    console.error('Falha ao migrar produtos pessoais para favoritos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
