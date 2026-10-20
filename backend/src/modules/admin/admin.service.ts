import type { Prisma } from '../../generated/prisma/client.js';
import { AppError, notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import { slugify } from '../../lib/slugify.js';
import {
  catalogProductDetailInclude,
  findCatalogProductById,
  listPublicProducts,
  toCatalogProductDetail,
} from '../catalog/catalog.service.js';
import type { PublicProductListQuery } from '../catalog/catalog.schemas.js';
import { normalizeSearchText } from '../catalog/search-normalization.js';
import { normalizeIngredientName } from '../ingredients/ingredient-names.js';
import { resolveIngredientIds } from '../ingredients/ingredient-resolver.js';
import type {
  AdminIngredientInput,
  AdminListQuery,
  AdminProductInput,
  AdminRecommendationRuleInput,
  AdminSearchSynonymInput,
} from './admin.schemas.js';

function catalogProductSlug(input: Pick<AdminProductInput, 'brand' | 'name'>): string {
  return slugify(`${input.brand} ${input.name}`) || 'produto';
}

async function ensureProductSlugAvailable(
  tx: Prisma.TransactionClient,
  input: AdminProductInput,
  slug: string,
  excludeId?: string,
): Promise<void> {
  const conflict = await tx.catalogProduct.findFirst({
    where: {
      OR: [{ slug }, { brand: input.brand, name: input.name }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) {
    throw new AppError(409, 'CONFLICT', 'Já existe um produto com esta marca e este nome.');
  }
}

export function listAdminProducts(query: PublicProductListQuery) {
  return listPublicProducts(query);
}

export async function getAdminProduct(id: string) {
  return toCatalogProductDetail(await findCatalogProductById(id));
}

export async function createAdminProduct(input: AdminProductInput) {
  const product = await prisma.$transaction(async (tx) => {
    const slug = catalogProductSlug(input);
    await ensureProductSlugAvailable(tx, input, slug);
    const ingredientIds = await resolveIngredientIds(tx, input.ingredients);
    return tx.catalogProduct.create({
      data: {
        slug,
        name: input.name,
        brand: input.brand,
        category: input.category,
        referenceUrl: input.referenceUrl,
        ingredients: {
          create: ingredientIds.map((ingredientId, index) => ({ ingredientId, position: index + 1 })),
        },
      },
      include: catalogProductDetailInclude,
    });
  });
  return toCatalogProductDetail(product);
}

export async function updateAdminProduct(id: string, input: AdminProductInput) {
  const product = await prisma.$transaction(async (tx) => {
    const product = await tx.catalogProduct.findUnique({ where: { id }, select: { id: true } });
    if (!product) throw notFound('Produto');

    const slug = catalogProductSlug(input);
    await ensureProductSlugAvailable(tx, input, slug, id);
    const ingredientIds = await resolveIngredientIds(tx, input.ingredients);
    await tx.catalogProductIngredient.deleteMany({ where: { catalogProductId: id } });

    return tx.catalogProduct.update({
      where: { id },
      data: {
        slug,
        name: input.name,
        brand: input.brand,
        category: input.category,
        referenceUrl: input.referenceUrl,
        ingredients: {
          create: ingredientIds.map((ingredientId, index) => ({ ingredientId, position: index + 1 })),
        },
      },
      include: catalogProductDetailInclude,
    });
  });
  return toCatalogProductDetail(product);
}

export async function deleteAdminProduct(id: string): Promise<void> {
  const result = await prisma.catalogProduct.deleteMany({ where: { id } });
  if (result.count === 0) throw notFound('Produto');
}

export async function listAdminIngredients(query: AdminListQuery) {
  const term = query.q ? normalizeIngredientName(query.q) : '';
  const where: Prisma.IngredientWhereInput = term
    ? {
        OR: [
          { normalizedName: { contains: term } },
          { name: { contains: query.q ?? '', mode: 'insensitive' } },
          { searchTerms: { has: term } },
          { synonyms: { has: query.q ?? '' } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      include: { sources: { orderBy: { title: 'asc' } } },
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ingredient.count({ where }),
  ]);
  return buildPage(items, total, query.page, query.pageSize);
}

function ingredientData(input: AdminIngredientInput) {
  const normalizedName = normalizeIngredientName(input.name);
  const synonyms = [...new Set(input.synonyms.map((item) => item.trim()).filter(Boolean))];
  const searchTerms = [...new Set([normalizedName, ...synonyms.map(normalizeIngredientName)])];
  return {
    name: input.name,
    normalizedName,
    synonyms,
    searchTerms,
    functions: input.functions,
    description: input.description,
    usageInfo: input.usageInfo,
    cautions: input.cautions,
    isCurated: true,
    sources: {
      create: input.sources.map((source) => ({
        title: source.title,
        publisher: source.publisher,
        url: source.url,
        note: source.note,
      })),
    },
  };
}

async function ensureIngredientNameAvailable(
  normalizedName: string,
  excludeId?: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  const conflict = await tx.ingredient.findFirst({
    where: { normalizedName, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (conflict) throw new AppError(409, 'CONFLICT', 'Já existe um ingrediente com este nome normalizado.');
}

export async function createAdminIngredient(input: AdminIngredientInput) {
  const data = ingredientData(input);
  await ensureIngredientNameAvailable(data.normalizedName);
  return prisma.ingredient.create({
    data,
    include: { sources: { orderBy: { title: 'asc' } } },
  });
}

export async function updateAdminIngredient(id: string, input: AdminIngredientInput) {
  const existing = await prisma.ingredient.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Ingrediente');
  const data = ingredientData(input);
  await ensureIngredientNameAvailable(data.normalizedName, id);
  return prisma.$transaction(async (tx) => {
    await tx.ingredientSource.deleteMany({ where: { ingredientId: id } });
    return tx.ingredient.update({
      where: { id },
      data,
      include: { sources: { orderBy: { title: 'asc' } } },
    });
  });
}

export async function deleteAdminIngredient(id: string): Promise<void> {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          products: true,
          catalogProducts: true,
          analyses: true,
          recommendationRules: true,
        },
      },
    },
  });
  if (!ingredient) throw notFound('Ingrediente');
  const references = Object.values(ingredient._count).reduce((total, count) => total + count, 0);
  if (references > 0) {
    throw new AppError(409, 'CONFLICT', 'O ingrediente está em uso e não pode ser excluído.');
  }
  await prisma.ingredient.delete({ where: { id } });
}

export async function listAdminSearchSynonyms() {
  return prisma.catalogSearchSynonym.findMany({ orderBy: { normalizedPhrase: 'asc' } });
}

function synonymData(input: AdminSearchSynonymInput) {
  const normalizedPhrase = normalizeSearchText(input.phrase);
  if (!normalizedPhrase) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A frase do sinônimo precisa conter letras ou números.');
  }
  return { ...input, normalizedPhrase };
}

async function ensureSynonymPhraseAvailable(normalizedPhrase: string, excludeId?: string): Promise<void> {
  const conflict = await prisma.catalogSearchSynonym.findFirst({
    where: { normalizedPhrase, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (conflict) throw new AppError(409, 'CONFLICT', 'Já existe um sinônimo para esta frase.');
}

export async function createAdminSearchSynonym(input: AdminSearchSynonymInput) {
  const data = synonymData(input);
  await ensureSynonymPhraseAvailable(data.normalizedPhrase);
  return prisma.catalogSearchSynonym.create({ data });
}

export async function updateAdminSearchSynonym(id: string, input: AdminSearchSynonymInput) {
  const existing = await prisma.catalogSearchSynonym.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Sinônimo');
  const data = synonymData(input);
  await ensureSynonymPhraseAvailable(data.normalizedPhrase, id);
  return prisma.catalogSearchSynonym.update({ where: { id }, data });
}

export async function deleteAdminSearchSynonym(id: string): Promise<void> {
  const result = await prisma.catalogSearchSynonym.deleteMany({ where: { id } });
  if (result.count === 0) throw notFound('Sinônimo');
}

export async function listAdminRecommendationRules() {
  return prisma.recommendationRule.findMany({
    include: { ingredient: { select: { id: true, name: true, isCurated: true } } },
    orderBy: [{ skinType: 'asc' }, { concern: 'asc' }, { ingredient: { name: 'asc' } }],
  });
}

async function ensureCuratedRuleIngredient(ingredientId: string): Promise<void> {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    select: { id: true, isCurated: true },
  });
  if (!ingredient) throw notFound('Ingrediente');
  if (!ingredient.isCurated) {
    throw new AppError(400, 'VALIDATION_ERROR', 'As regras só podem usar ingredientes da referência curada.');
  }
}

async function ensureRuleUnique(
  input: Pick<AdminRecommendationRuleInput, 'ingredientId' | 'skinType' | 'concern'>,
  excludeId?: string,
): Promise<void> {
  const conflict = await prisma.recommendationRule.findFirst({
    where: {
      ingredientId: input.ingredientId,
      skinType: input.skinType,
      concern: input.concern,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) throw new AppError(409, 'CONFLICT', 'Já existe uma regra para este ingrediente e indicação.');
}

export async function createAdminRecommendationRule(input: AdminRecommendationRuleInput) {
  await ensureCuratedRuleIngredient(input.ingredientId);
  await ensureRuleUnique(input);
  return prisma.recommendationRule.create({
    data: input,
    include: { ingredient: { select: { id: true, name: true, isCurated: true } } },
  });
}

export async function updateAdminRecommendationRule(id: string, input: AdminRecommendationRuleInput) {
  const existing = await prisma.recommendationRule.findUnique({ where: { id }, select: { id: true, version: true } });
  if (!existing) throw notFound('Regra de indicação');
  await ensureCuratedRuleIngredient(input.ingredientId);
  await ensureRuleUnique(input, id);
  return prisma.recommendationRule.update({
    where: { id },
    data: { ...input, version: existing.version + 1 },
    include: { ingredient: { select: { id: true, name: true, isCurated: true } } },
  });
}

export async function deleteAdminRecommendationRule(id: string): Promise<void> {
  const result = await prisma.recommendationRule.deleteMany({ where: { id } });
  if (result.count === 0) throw notFound('Regra de indicação');
}
