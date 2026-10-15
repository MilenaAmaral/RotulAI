import { prisma } from '../../lib/prisma.js';

export type ActivityType = 'PRODUCT_CREATED' | 'INGREDIENT_LOOKUP' | 'COMPARISON' | 'CONVERSATION';

export interface ActivityItem {
  type: ActivityType;
  id: string;
  title: string;
  date: Date;
}

const RECENT_LIMIT = 8;

/** Indicadores calculados a partir de dados reais do usuário autenticado. */
export async function getDashboard(userId: string) {
  const [user, products, ingredientLookups, distinctIngredients, comparisons, conversations] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    prisma.product.count({ where: { userId } }),
    prisma.ingredientAnalysis.count({ where: { userId } }),
    prisma.ingredientAnalysis.findMany({ where: { userId }, distinct: ['query'], select: { query: true } }),
    prisma.productComparison.count({ where: { userId } }),
    prisma.conversation.count({ where: { userId } }),
  ]);

  const [recentProducts, recentLookups, recentComparisons, recentConversations, productsByCategory] = await Promise.all(
    [
      prisma.product.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: { id: true, name: true, brand: true, createdAt: true },
      }),
      prisma.ingredientAnalysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: { id: true, query: true, createdAt: true },
      }),
      prisma.productComparison.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: { id: true, result: true, createdAt: true },
      }),
      prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: RECENT_LIMIT,
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.product.groupBy({ by: ['category'], where: { userId }, _count: { _all: true } }),
    ],
  );

  const comparisonTitle = (result: unknown): string => {
    const value = result as { productA?: { name?: string }; productB?: { name?: string } } | null;
    return `${value?.productA?.name ?? 'Produto removido'} x ${value?.productB?.name ?? 'Produto removido'}`;
  };

  const recentActivity: ActivityItem[] = [
    ...recentProducts.map((item) => ({
      type: 'PRODUCT_CREATED' as const,
      id: item.id,
      title: `${item.name} (${item.brand})`,
      date: item.createdAt,
    })),
    ...recentLookups.map((item) => ({
      type: 'INGREDIENT_LOOKUP' as const,
      id: item.id,
      title: item.query,
      date: item.createdAt,
    })),
    ...recentComparisons.map((item) => ({
      type: 'COMPARISON' as const,
      id: item.id,
      title: comparisonTitle(item.result),
      date: item.createdAt,
    })),
    ...recentConversations.map((item) => ({
      type: 'CONVERSATION' as const,
      id: item.id,
      title: item.title,
      date: item.updatedAt,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, RECENT_LIMIT);

  return {
    userName: user.name,
    stats: {
      products,
      ingredientLookups,
      distinctIngredientsLookedUp: distinctIngredients.length,
      comparisons,
      conversations,
    },
    productsByCategory: productsByCategory
      .map((row) => ({ category: row.category, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    recentActivity,
  };
}
