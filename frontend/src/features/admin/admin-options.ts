import { CATEGORY_LABELS } from '../../lib/format';
import type { ProductCategory, SkinConcern, SkinType } from '../../types/api';

export const SKIN_TYPES: Array<[SkinType, string]> = [
  ['OILY', 'Oleosa'],
  ['DRY', 'Seca'],
  ['COMBINATION', 'Mista'],
  ['SENSITIVE', 'Sensível'],
  ['NORMAL', 'Normal'],
];

export const CONCERNS: Array<[SkinConcern, string]> = [
  ['ACNE_PRONE', 'Tendência acneica'],
  ['PIGMENTATION', 'Manchas'],
  ['DEHYDRATION', 'Desidratação'],
  ['SENSITIVITY', 'Sensibilidade'],
  ['SUN_PROTECTION', 'Proteção solar'],
];

export function isProductCategory(value: string): value is ProductCategory {
  return Object.hasOwn(CATEGORY_LABELS, value);
}

export function isSkinType(value: string): value is SkinType {
  return SKIN_TYPES.some(([option]) => option === value);
}

export function isSkinConcern(value: string): value is SkinConcern {
  return CONCERNS.some(([option]) => option === value);
}

export function labelFor<T extends string>(options: Array<[T, string]>, value: T): string {
  return options.find(([key]) => key === value)?.[1] ?? value;
}

/**
 * Lê um campo "um item por linha". Vírgulas não separam itens, porque fazem parte
 * de nomes reais (ex.: sinônimos como "1,2-Hexanediol").
 */
export function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface ParsedSources {
  sources: Array<{ title: string; publisher: string; url: string; note: string | null }>;
  error: string | null;
}

/** Converte linhas no formato "título | publicação | URL | observação opcional". */
export function parseSources(value: string): ParsedSources {
  const sources: ParsedSources['sources'] = [];
  for (const [index, row] of parseLines(value).entries()) {
    const [title, publisher, url, note = ''] = row.split('|').map((part) => part.trim());
    if (!title || !publisher || !url) {
      return {
        sources: [],
        error: `Fonte da linha ${index + 1}: use o formato título | publicação | URL | observação opcional.`,
      };
    }
    sources.push({ title, publisher, url, note: note || null });
  }
  return { sources, error: null };
}
