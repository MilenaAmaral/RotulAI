import type { Prisma } from '../../generated/prisma/client.js';
import { notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { resolveIngredientIds } from '../ingredients/ingredient-resolver.js';
import type { ProductInput, ProductListQuery } from './products.schemas.js';

export const productDetailInclude = {
  ingredients: {
    orderBy: { position: 'asc' },
    select: {
      position: true,
      ingredient: { select: { id: true, name: true, functions: true, isCurated: true } },
    },
  },
} as const satisfies Prisma.ProductInclude;

export type ProductWithIngredients = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

function toProductDetail(product: ProductWithIngredients) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    imageUrl: product.imageUrl,
    referenceUrl: product.referenceUrl,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    ingredients: product.ingredients.map((item) => ({ ...item.ingredient, position: item.position })),
  };
}

export async function listProducts(userId: string, query: ProductListQuery) {
  const where: Prisma.ProductWhereInput = {
    userId,
    ...(query.category ? { category: query.category } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { brand: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        description: true,
        imageUrl: true,
        createdAt: true,
        _count: { select: { ingredients: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  const items = rows.map(({ _count, ...product }) => ({ ...product, ingredientCount: _count.ingredients }));
  return buildPage(items, total, query.page, query.pageSize);
}

export async function exportLegacyProducts(userId: string) {
  return prisma.product.findMany({
    where: { userId },
    include: {
      ingredients: {
        orderBy: { position: 'asc' },
        select: {
          position: true,
          ingredient: { select: { name: true, normalizedName: true } },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
}

/** Busca sempre filtrando por userId: produtos de outros usuários resultam em 404. */
export async function findOwnedProduct(userId: string, productId: string): Promise<ProductWithIngredients> {
  const product = await prisma.product.findFirst({
    where: { id: productId, userId },
    include: productDetailInclude,
  });
  if (!product) throw notFound('Produto');
  return product;
}

export async function getProduct(userId: string, productId: string) {
  return toProductDetail(await findOwnedProduct(userId, productId));
}

export async function createProduct(userId: string, input: ProductInput) {
  const product = await prisma.$transaction(async (tx) => {
    const ingredientIds = await resolveIngredientIds(tx, input.ingredients);
    return tx.product.create({
      data: {
        userId,
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
      include: productDetailInclude,
    });
  });
  return toProductDetail(product);
}

export async function updateProduct(userId: string, productId: string, input: ProductInput) {
  const product = await prisma.$transaction(async (tx) => {
    const owned = await tx.product.findFirst({ where: { id: productId, userId }, select: { id: true } });
    if (!owned) throw notFound('Produto');
    const ingredientIds = await resolveIngredientIds(tx, input.ingredients);
    await tx.productIngredient.deleteMany({ where: { productId } });
    return tx.product.update({
      where: { id: productId },
      data: {
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
      include: productDetailInclude,
    });
  });
  return toProductDetail(product);
}

export async function deleteProduct(userId: string, productId: string): Promise<void> {
  const result = await prisma.product.deleteMany({ where: { id: productId, userId } });
  if (result.count === 0) throw notFound('Produto');
}
