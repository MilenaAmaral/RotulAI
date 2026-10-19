import { notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';

export async function listFavorites(userId: string, page: number, pageSize: number) {
  const where = { userId };
  const [rows, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      include: {
        catalogProduct: {
          include: {
            _count: { select: { ingredients: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { catalogProductId: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.favorite.count({ where }),
  ]);
  const items = rows.map(({ catalogProduct, createdAt }) => ({
    ...catalogProduct,
    ingredientCount: catalogProduct._count.ingredients,
    favoritedAt: createdAt,
  }));
  return buildPage(items, total, page, pageSize);
}

export async function addFavorite(userId: string, catalogProductId: string) {
  const product = await prisma.catalogProduct.findUnique({
    where: { id: catalogProductId },
    select: { id: true },
  });
  if (!product) throw notFound('Produto');
  return prisma.favorite.upsert({
    where: { userId_catalogProductId: { userId, catalogProductId } },
    create: { userId, catalogProductId },
    update: {},
  });
}

export async function getFavoriteStatus(userId: string, catalogProductId: string) {
  const product = await prisma.catalogProduct.findUnique({
    where: { id: catalogProductId },
    select: { id: true },
  });
  if (!product) throw notFound('Produto');
  const favorite = await prisma.favorite.findUnique({
    where: { userId_catalogProductId: { userId, catalogProductId } },
    select: { userId: true },
  });
  return { isFavorite: Boolean(favorite) };
}

export async function removeFavorite(userId: string, catalogProductId: string): Promise<void> {
  await prisma.favorite.deleteMany({ where: { userId, catalogProductId } });
}
