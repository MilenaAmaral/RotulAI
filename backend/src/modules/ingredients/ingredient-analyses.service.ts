import { notFound } from '../../lib/errors.js';
import { buildPage } from '../../lib/pagination.js';
import { prisma } from '../../lib/prisma.js';
import type { AiService } from '../ai/ai.service.js';
import { asUntrustedData, INGREDIENT_GUIDANCE } from '../ai/prompts.js';
import { cleanDisplayName } from './ingredient-names.js';
import { findIngredientByName, toIngredientDetail } from './ingredients.service.js';

const analysisInclude = {
  ingredient: {
    include: { sources: { select: { id: true, title: true, publisher: true, url: true, note: true } } },
  },
} as const;

type AnalysisRow = Awaited<ReturnType<typeof findOwnedAnalysis>>;

async function findOwnedAnalysis(userId: string, analysisId: string) {
  const analysis = await prisma.ingredientAnalysis.findFirst({
    where: { id: analysisId, userId },
    include: analysisInclude,
  });
  if (!analysis) throw notFound('Consulta');
  return analysis;
}

function toAnalysisDto(analysis: AnalysisRow) {
  const ingredient = analysis.ingredient ? toIngredientDetail(analysis.ingredient) : null;
  return {
    id: analysis.id,
    query: analysis.query,
    foundInCatalog: analysis.foundInCatalog,
    createdAt: analysis.createdAt,
    ingredient,
    // A explicação da IA é sempre separada do conteúdo da base de referência.
    aiExplanation: analysis.aiExplanation ? { text: analysis.aiExplanation, model: analysis.aiModel } : null,
  };
}

/** Consulta um ingrediente na base e registra a consulta no histórico do usuário. */
export async function lookupIngredient(userId: string, query: string) {
  const ingredient = await findIngredientByName(query);
  // Só conta como "encontrado na base" quando há conteúdo curado com informações verificadas.
  const foundInCatalog = Boolean(ingredient?.isCurated);
  const analysis = await prisma.ingredientAnalysis.create({
    data: {
      userId,
      query: cleanDisplayName(query),
      ingredientId: ingredient?.id ?? null,
      foundInCatalog,
    },
    include: analysisInclude,
  });
  return toAnalysisDto(analysis);
}

export async function explainAnalysis(userId: string, analysisId: string, ai: AiService) {
  const analysis = await findOwnedAnalysis(userId, analysisId);
  const ingredientName = analysis.ingredient?.name ?? analysis.query;
  const reference = analysis.ingredient?.isCurated
    ? `Funções registradas na base de referência: ${analysis.ingredient.functions.join(', ') || 'não informadas'}.`
    : 'Este ingrediente não possui informações verificadas na base de referência do SkinAI.';

  const result = await ai.generate({
    userId,
    feature: 'INGREDIENT_EXPLANATION',
    guidance: INGREDIENT_GUIDANCE,
    messages: [
      {
        role: 'user',
        content: `${asUntrustedData('ingrediente', `${ingredientName}\n${reference}`)}\nExplique este ingrediente cosmético.`,
      },
    ],
  });

  const updated = await prisma.ingredientAnalysis.update({
    where: { id: analysis.id },
    data: { aiExplanation: result.text, aiModel: result.model },
    include: analysisInclude,
  });
  return toAnalysisDto(updated);
}

export async function listAnalyses(userId: string, page: number, pageSize: number) {
  const [rows, total] = await Promise.all([
    prisma.ingredientAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: analysisInclude,
    }),
    prisma.ingredientAnalysis.count({ where: { userId } }),
  ]);
  return buildPage(rows.map(toAnalysisDto), total, page, pageSize);
}

export async function getAnalysis(userId: string, analysisId: string) {
  return toAnalysisDto(await findOwnedAnalysis(userId, analysisId));
}

export async function deleteAnalysis(userId: string, analysisId: string): Promise<void> {
  const result = await prisma.ingredientAnalysis.deleteMany({ where: { id: analysisId, userId } });
  if (result.count === 0) throw notFound('Consulta');
}

export async function clearAnalyses(userId: string): Promise<number> {
  const result = await prisma.ingredientAnalysis.deleteMany({ where: { userId } });
  return result.count;
}
