import type { Prisma } from '../../generated/prisma/client.js';
import { AppError, notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import type { AiService } from '../ai/ai.service.js';
import { asUntrustedData, COMPARISON_GUIDANCE } from '../ai/prompts.js';
import type { ProductWithIngredients } from '../products/products.service.js';
import { findOwnedProduct } from '../products/products.service.js';
import type { ComparableProduct, ComparisonResult } from './compare-products.js';
import { compareProducts } from './compare-products.js';

function toComparable(product: ProductWithIngredients): ComparableProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    ingredients: product.ingredients.map((item) => ({
      id: item.ingredient.id,
      name: item.ingredient.name,
      position: item.position,
    })),
  };
}

type ComparisonRow = Prisma.ProductComparisonGetPayload<object>;

function toComparisonDto(row: ComparisonRow) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    result: row.result as unknown as ComparisonResult,
    aiExplanation: row.aiExplanation ? { text: row.aiExplanation, model: row.aiModel } : null,
  };
}

export async function createComparison(userId: string, productAId: string, productBId: string) {
  if (productAId === productBId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Selecione dois produtos diferentes.');
  }
  const [productA, productB] = await Promise.all([
    findOwnedProduct(userId, productAId),
    findOwnedProduct(userId, productBId),
  ]);
  const result = compareProducts(toComparable(productA), toComparable(productB));
  const row = await prisma.productComparison.create({
    data: {
      userId,
      productAId,
      productBId,
      result: result as unknown as Prisma.InputJsonValue,
    },
  });
  return toComparisonDto(row);
}

async function findOwnedComparison(userId: string, comparisonId: string) {
  const row = await prisma.productComparison.findFirst({ where: { id: comparisonId, userId } });
  if (!row) throw notFound('Comparação');
  return row;
}

export async function getComparison(userId: string, comparisonId: string) {
  return toComparisonDto(await findOwnedComparison(userId, comparisonId));
}

export async function listComparisons(userId: string, page: number, pageSize: number) {
  const [rows, total] = await Promise.all([
    prisma.productComparison.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productComparison.count({ where: { userId } }),
  ]);
  return buildPage(rows.map(toComparisonDto), total, page, pageSize);
}

export function describeComparisonForAi(result: ComparisonResult): string {
  const list = (items: Array<{ name: string }>) =>
    items.length ? items.map((item) => item.name).join(', ') : 'nenhum';
  return [
    `Produto A: ${result.productA.name} (${result.productA.brand}), categoria ${result.productA.category}.`,
    `Descrição A: ${result.productA.description ?? 'não informada'}`,
    `Produto B: ${result.productB.name} (${result.productB.brand}), categoria ${result.productB.category}.`,
    `Descrição B: ${result.productB.description ?? 'não informada'}`,
    `Ingredientes em comum: ${list(result.commonIngredients)}`,
    `Exclusivos do produto A: ${list(result.exclusiveToA)}`,
    `Exclusivos do produto B: ${list(result.exclusiveToB)}`,
    `Sobreposição de composição: ${result.overlapPercentage}%`,
  ].join('\n');
}

export async function explainComparison(userId: string, comparisonId: string, ai: AiService) {
  const row = await findOwnedComparison(userId, comparisonId);
  const result = row.result as unknown as ComparisonResult;
  const explanation = await ai.generate({
    userId,
    feature: 'COMPARISON_EXPLANATION',
    guidance: COMPARISON_GUIDANCE,
    messages: [
      {
        role: 'user',
        content: `${asUntrustedData('comparacao', describeComparisonForAi(result))}\nExplique as diferenças entre esses produtos.`,
      },
    ],
  });
  const updated = await prisma.productComparison.update({
    where: { id: row.id },
    data: { aiExplanation: explanation.text, aiModel: explanation.model },
  });
  return toComparisonDto(updated);
}

export async function deleteComparison(userId: string, comparisonId: string): Promise<void> {
  const result = await prisma.productComparison.deleteMany({ where: { id: comparisonId, userId } });
  if (result.count === 0) throw notFound('Comparação');
}

export async function clearComparisons(userId: string): Promise<number> {
  return (await prisma.productComparison.deleteMany({ where: { userId } })).count;
}
