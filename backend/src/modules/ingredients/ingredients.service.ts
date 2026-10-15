import type { Prisma } from '../../generated/prisma/client.js';
import { notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { normalizeIngredientName, uniqueIngredientNames } from './ingredient-names.js';

type Tx = Prisma.TransactionClient;

const ingredientSummarySelect = {
  id: true,
  name: true,
  synonyms: true,
  functions: true,
  isCurated: true,
} as const;

/**
 * Converte nomes de um rótulo em ids do catálogo global, reaproveitando ingredientes
 * existentes (inclusive por sinônimo) e criando apenas os que ainda não existem.
 * Retorna os ids na mesma ordem do rótulo, sem duplicados.
 */
export async function resolveIngredientIds(tx: Tx, names: readonly string[]): Promise<string[]> {
  const unique = uniqueIngredientNames(names);
  if (unique.length === 0) return [];
  const normalized = unique.map((item) => item.normalizedName);

  const findMatches = () =>
    tx.ingredient.findMany({
      where: { OR: [{ normalizedName: { in: normalized } }, { searchTerms: { hasSome: normalized } }] },
      select: { id: true, normalizedName: true, searchTerms: true, isCurated: true },
    });

  const matchFor = (rows: Awaited<ReturnType<typeof findMatches>>, name: string) =>
    rows.find((row) => row.normalizedName === name) ??
    rows.find((row) => row.isCurated && row.searchTerms.includes(name)) ??
    rows.find((row) => row.searchTerms.includes(name));

  let rows = await findMatches();
  const missing = unique.filter((item) => !matchFor(rows, item.normalizedName));
  if (missing.length > 0) {
    await tx.ingredient.createMany({
      data: missing.map((item) => ({
        name: item.displayName,
        normalizedName: item.normalizedName,
        searchTerms: [item.normalizedName],
      })),
      skipDuplicates: true,
    });
    rows = await findMatches();
  }

  const ids: string[] = [];
  for (const item of unique) {
    const match = matchFor(rows, item.normalizedName);
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

export async function searchIngredients(params: { q?: string; curatedOnly: boolean; page: number; pageSize: number }) {
  const term = params.q ? normalizeIngredientName(params.q) : '';
  const where: Prisma.IngredientWhereInput = {
    ...(params.curatedOnly ? { isCurated: true } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { searchTerms: { has: term } },
            { synonyms: { has: params.q?.trim() ?? '' } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      select: ingredientSummarySelect,
      orderBy: [{ isCurated: 'desc' }, { name: 'asc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.ingredient.count({ where }),
  ]);
  return buildPage(items, total, params.page, params.pageSize);
}

const ingredientDetailInclude = {
  sources: { select: { id: true, title: true, publisher: true, url: true, note: true } },
} as const;

/** Detalhe do ingrediente + produtos do próprio usuário que o contêm. */
export async function getIngredientDetail(userId: string, ingredientId: string) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    include: ingredientDetailInclude,
  });
  if (!ingredient) throw notFound('Ingrediente');

  const products = await prisma.product.findMany({
    where: { userId, ingredients: { some: { ingredientId } } },
    select: { id: true, name: true, brand: true },
    orderBy: { name: 'asc' },
    take: 20,
  });

  return { ...toIngredientDetail(ingredient), userProducts: products };
}

type IngredientWithSources = Prisma.IngredientGetPayload<{ include: typeof ingredientDetailInclude }>;

export function toIngredientDetail(ingredient: IngredientWithSources) {
  return {
    id: ingredient.id,
    name: ingredient.name,
    synonyms: ingredient.synonyms,
    functions: ingredient.functions,
    description: ingredient.description,
    usageInfo: ingredient.usageInfo,
    cautions: ingredient.cautions,
    isCurated: ingredient.isCurated,
    sources: ingredient.sources,
  };
}

/** Busca exata por nome normalizado ou sinônimo, priorizando a base curada. */
export async function findIngredientByName(query: string): Promise<IngredientWithSources | null> {
  const term = normalizeIngredientName(query);
  const exact = await prisma.ingredient.findUnique({
    where: { normalizedName: term },
    include: ingredientDetailInclude,
  });
  if (exact) return exact;
  return prisma.ingredient.findFirst({
    where: { searchTerms: { has: term } },
    include: ingredientDetailInclude,
    orderBy: { isCurated: 'desc' },
  });
}
