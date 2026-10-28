export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function searchTokens(value: string): string[] {
  return [
    ...new Set(
      normalizeSearchText(value)
        .split(' ')
        .filter((token) => token.length >= 2),
    ),
  ];
}

/**
 * Palavras que não ajudam a identificar um produto e, na busca aproximada,
 * casavam com quase todo o catálogo ("com" com "copolymer", "pele" com "peel").
 */
const GENERIC_SEARCH_WORDS = new Set([
  'a',
  'as',
  'o',
  'os',
  'e',
  'de',
  'da',
  'das',
  'do',
  'dos',
  'em',
  'na',
  'nas',
  'no',
  'nos',
  'com',
  'sem',
  'para',
  'pra',
  'por',
  'um',
  'uma',
  'meu',
  'minha',
  'que',
  'pele',
  'rosto',
  'facial',
  'produto',
  'produtos',
  'tipo',
  'acido',
]);

/** Palavras da consulta usadas na busca aproximada: sem termos genéricos e com pelo menos 3 letras. */
export function searchKeywords(value: string): string[] {
  return searchTokens(value).filter((token) => token.length >= 3 && !GENERIC_SEARCH_WORDS.has(token));
}

export interface CatalogSearchSynonymInput {
  normalizedPhrase: string;
  expansions: readonly string[];
  category: string | null;
}

/**
 * Expande a consulta com os sinônimos cadastrados.
 * As expansões entram como frases inteiras: quebrá-las em palavras soltas ("sodium", "acid")
 * fazia a busca casar com quase todos os produtos.
 */
export function expandSearchQuery(rawQuery: string, synonyms: readonly CatalogSearchSynonymInput[]) {
  const query = normalizeSearchText(rawQuery);
  const phrases = new Set([query]);
  const categories = new Set<string>();
  const keywords = searchKeywords(query);
  const terms = new Set(keywords);

  for (const synonym of synonyms) {
    if (!containsSearchPhrase(query, synonym.normalizedPhrase)) continue;
    if (synonym.category) categories.add(synonym.category);
    for (const expansion of synonym.expansions) {
      const normalizedExpansion = normalizeSearchText(expansion);
      if (!normalizedExpansion) continue;
      phrases.add(normalizedExpansion);
      terms.add(normalizedExpansion);
    }
  }

  return {
    query,
    phrases: [...phrases].filter(Boolean),
    terms: [...terms],
    // Só as palavras digitadas buscam nomes de ingredientes por aproximação; as expansões
    // usam a correspondência exata dos termos curados, para "azelaic acid" não casar com "citric acid".
    keywords,
    categories: [...categories],
  };
}

export function containsSearchPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `);
}
