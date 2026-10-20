import { Prisma } from '../../generated/prisma/client.js';
import type { ProductCategory } from '../../generated/prisma/enums.js';
import { notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { normalizeIngredientName } from '../ingredients/ingredient-names.js';
import { containsSearchPhrase, normalizeSearchText, searchTokens } from './search-normalization.js';
import type { PublicIngredientListQuery, PublicProductListQuery } from './catalog.schemas.js';

interface CatalogProductSearchRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  ingredientCount: number;
  relevance: number;
  exactMatch: boolean;
}

interface CatalogSearchSummary {
  total: number;
  hasExactMatch: boolean;
}

function textArray(values: string[]): Prisma.Sql {
  if (values.length === 0) return Prisma.sql`ARRAY[]::text[]`;
  return Prisma.sql`ARRAY[${Prisma.join(values.map((value) => Prisma.sql`${value}::text`))}]::text[]`;
}

function categoryArray(values: string[]): Prisma.Sql {
  if (values.length === 0) return Prisma.sql`ARRAY[]::"ProductCategory"[]`;
  return Prisma.sql`ARRAY[${Prisma.join(values.map((value) => Prisma.sql`${value}::"ProductCategory"`))}]::"ProductCategory"[]`;
}

function buildCatalogSearchCte(params: {
  query: string;
  terms: string[];
  phrases: string[];
  categories: string[];
  category?: string;
}): Prisma.Sql {
  const terms = textArray(params.terms);
  const phrases = textArray(params.phrases);
  const categories = categoryArray(params.categories);
  const categoryFilter = params.category ?? null;
  return Prisma.sql`
    WITH input AS (
      SELECT
        ${params.query}::text AS query,
        ${terms} AS terms,
        ${phrases} AS phrases,
        ${categories} AS synonym_categories,
        ${categoryFilter}::"ProductCategory" AS category_filter
    ),
    candidates AS (
      SELECT
        product."id",
        product."slug",
        product."name",
        product."brand",
        product."category",
        (
          SELECT COUNT(*)::int
          FROM "CatalogProductIngredient" product_ingredient
          WHERE product_ingredient."catalogProductId" = product."id"
        ) AS "ingredientCount",
        (
          input.query <> ''
          AND (
            public.rotulai_unaccent(lower(product."name")) = input.query
            OR public.rotulai_unaccent(lower(product."brand")) = input.query
          )
        ) AS "exactMatch",
        (product."category" = ANY(input.synonym_categories)) AS "categoryMatch",
        EXISTS (
          SELECT 1
          FROM "CatalogProductIngredient" product_ingredient
          JOIN "Ingredient" ingredient ON ingredient."id" = product_ingredient."ingredientId"
          WHERE product_ingredient."catalogProductId" = product."id"
            AND ingredient."searchTerms" && input.phrases
        ) AS "ingredientMatch",
        GREATEST(
          similarity(public.rotulai_unaccent(lower(product."name")), input.query),
          similarity(public.rotulai_unaccent(lower(product."brand")), input.query),
          COALESCE((
            SELECT MAX(GREATEST(
              word_similarity(search_term.term, public.rotulai_unaccent(lower(product."name"))),
              word_similarity(search_term.term, public.rotulai_unaccent(lower(product."brand")))
            ))
            FROM unnest(input.terms) AS search_term(term)
          ), 0),
          CASE WHEN product."category" = ANY(input.synonym_categories) THEN 0.65 ELSE 0 END,
          CASE WHEN EXISTS (
            SELECT 1
            FROM "CatalogProductIngredient" product_ingredient
            JOIN "Ingredient" ingredient ON ingredient."id" = product_ingredient."ingredientId"
            WHERE product_ingredient."catalogProductId" = product."id"
              AND ingredient."searchTerms" && input.phrases
          ) THEN 0.7 ELSE 0 END
        )::double precision AS relevance
      FROM "CatalogProduct" product
      CROSS JOIN input
      WHERE (input.category_filter IS NULL OR product."category" = input.category_filter)
        AND (
          input.query = ''
          OR product."category" = ANY(input.synonym_categories)
          OR public.rotulai_unaccent(lower(product."name")) %> input.query
          OR public.rotulai_unaccent(lower(product."brand")) %> input.query
          OR EXISTS (
            SELECT 1
            FROM unnest(input.terms) AS search_term(term)
            WHERE public.rotulai_unaccent(lower(product."name")) %> search_term.term
              OR public.rotulai_unaccent(lower(product."brand")) %> search_term.term
          )
          OR EXISTS (
            SELECT 1
            FROM "CatalogProductIngredient" product_ingredient
            JOIN "Ingredient" ingredient ON ingredient."id" = product_ingredient."ingredientId"
            WHERE product_ingredient."catalogProductId" = product."id"
              AND (
                ingredient."searchTerms" && input.phrases
                OR EXISTS (
                  SELECT 1
                  FROM unnest(input.terms) AS search_term(term)
                  WHERE public.rotulai_unaccent(lower(ingredient."name")) %> search_term.term
                )
              )
          )
        )
    )
  `;
}

function buildSearchInput(
  query: PublicProductListQuery,
  synonyms: Array<{
    normalizedPhrase: string;
    expansions: string[];
    category: string | null;
  }>,
) {
  const normalizedQuery = normalizeSearchText(query.q ?? '');
  const expandedPhrases = new Set([normalizedQuery]);
  const categories = new Set<string>();
  const expandedTerms = new Set(searchTokens(normalizedQuery));

  for (const synonym of synonyms) {
    if (!containsSearchPhrase(normalizedQuery, synonym.normalizedPhrase)) continue;
    if (synonym.category) categories.add(synonym.category);
    for (const expansion of synonym.expansions) {
      const normalizedExpansion = normalizeSearchText(expansion);
      expandedPhrases.add(normalizedExpansion);
      for (const token of searchTokens(normalizedExpansion)) expandedTerms.add(token);
    }
  }

  return {
    query: normalizedQuery,
    phrases: [...expandedPhrases].filter(Boolean),
    terms: [...expandedTerms],
    categories: [...categories],
    category: query.category,
  };
}

async function fetchSearchRows(
  tx: Prisma.TransactionClient,
  cte: Prisma.Sql,
  take: number,
  skip: number,
): Promise<CatalogProductSearchRow[]> {
  return tx.$queryRaw<CatalogProductSearchRow[]>(Prisma.sql`
    ${cte}
    SELECT
      candidates."id",
      candidates."slug",
      candidates."name",
      candidates."brand",
      candidates."category",
      candidates."ingredientCount",
      candidates."relevance",
      candidates."exactMatch"
    FROM candidates
    ORDER BY
      candidates."exactMatch" DESC,
      candidates."categoryMatch" DESC,
      candidates."ingredientMatch" DESC,
      candidates."relevance" DESC,
      candidates."brand" ASC,
      candidates."name" ASC
    LIMIT ${take} OFFSET ${skip}
  `);
}

export async function listPublicProducts(query: PublicProductListQuery) {
  const synonymRows = await prisma.catalogSearchSynonym.findMany({
    select: { normalizedPhrase: true, expansions: true, category: true },
  });
  const search = buildSearchInput(query, synonymRows);
  const cte = buildCatalogSearchCte(search);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = '0.32'`;
    const [summary] = await tx.$queryRaw<CatalogSearchSummary[]>(Prisma.sql`
      ${cte}
      SELECT COUNT(*)::int AS total, COALESCE(BOOL_OR("exactMatch"), false) AS "hasExactMatch"
      FROM candidates
    `);
    const skip = (query.page - 1) * query.pageSize;
    const rows = await fetchSearchRows(tx, cte, Math.max(query.pageSize, 3), skip);
    const suggestionRows =
      search.query && !summary?.hasExactMatch ? (query.page === 1 ? rows : await fetchSearchRows(tx, cte, 3, 0)) : [];
    return { summary, rows, suggestionRows };
  });

  const items = result.rows.map(({ relevance: _relevance, exactMatch: _exactMatch, ...product }) => product);
  const suggestions = result.suggestionRows
    .slice(0, 3)
    .map(({ relevance: _relevance, exactMatch: _exactMatch, ...product }) => product);
  return {
    ...buildPage(items.slice(0, query.pageSize), result.summary?.total ?? 0, query.page, query.pageSize),
    suggestions,
  };
}

export const catalogProductDetailInclude = {
  ingredients: {
    orderBy: { position: 'asc' },
    select: {
      position: true,
      ingredient: { select: { id: true, name: true, functions: true, isCurated: true } },
    },
  },
} as const satisfies Prisma.CatalogProductInclude;

export type CatalogProductWithIngredients = Prisma.CatalogProductGetPayload<{
  include: typeof catalogProductDetailInclude;
}>;

/** Formato público do produto: ingredientes já na ordem do rótulo, sem a tabela de junção. */
export function toCatalogProductDetail(product: CatalogProductWithIngredients) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    referenceUrl: product.referenceUrl,
    ingredients: product.ingredients.map(({ position, ingredient }) => ({ ...ingredient, position })),
  };
}

export async function findCatalogProductById(id: string): Promise<CatalogProductWithIngredients> {
  const product = await prisma.catalogProduct.findUnique({ where: { id }, include: catalogProductDetailInclude });
  if (!product) throw notFound('Produto');
  return product;
}

export async function getPublicProduct(slug: string) {
  const product = await prisma.catalogProduct.findUnique({ where: { slug }, include: catalogProductDetailInclude });
  if (!product) throw notFound('Produto');
  return toCatalogProductDetail(product);
}

export async function listPublicIngredients(query: PublicIngredientListQuery) {
  const term = query.q ? normalizeIngredientName(query.q) : '';
  const where: Prisma.IngredientWhereInput = {
    isCurated: true,
    ...(query.function ? { functions: { has: query.function } } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { searchTerms: { has: term } },
            { synonyms: { has: query.q?.trim() ?? '' } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      select: { id: true, name: true, synonyms: true, functions: true },
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ingredient.count({ where }),
  ]);
  return buildPage(items, total, query.page, query.pageSize);
}

export async function listPublicIngredientFunctions(): Promise<string[]> {
  const rows = await prisma.ingredient.findMany({
    where: { isCurated: true },
    select: { functions: true },
  });
  return [...new Set(rows.flatMap((row) => row.functions))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function getPublicIngredient(id: string) {
  const ingredient = await prisma.ingredient.findFirst({
    where: { id, isCurated: true },
    include: {
      sources: { select: { id: true, title: true, publisher: true, url: true, note: true } },
    },
  });
  if (!ingredient) throw notFound('Ingrediente');
  return {
    id: ingredient.id,
    name: ingredient.name,
    synonyms: ingredient.synonyms,
    functions: ingredient.functions,
    description: ingredient.description,
    usageInfo: ingredient.usageInfo,
    cautions: ingredient.cautions,
    sources: ingredient.sources,
  };
}
