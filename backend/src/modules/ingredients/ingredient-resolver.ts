import type { Prisma } from '../../generated/prisma/client.js';
import { uniqueIngredientNames } from './ingredient-names.js';

type Tx = Prisma.TransactionClient;

// Sem dependência do cliente Prisma global: usado pela API e pelo seed.
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
