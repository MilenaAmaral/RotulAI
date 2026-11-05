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

function singularizeToken(token: string): string {
  return token.length > 3 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token;
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
  return [
    ...new Set(
      searchTokens(value)
        .map(singularizeToken)
        .filter((token) => token.length >= 3 && !GENERIC_SEARCH_WORDS.has(token)),
    ),
  ];
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
  const phrases = new Set<string>();
  const categories = new Set<string>();
  const keywords = searchKeywords(query);
  const terms = new Set<string>();
  const normalizedKeywords = query
    .split(' ')
    .map(singularizeToken)
    .filter((token) => token && !GENERIC_SEARCH_WORDS.has(token));
  const matchedSynonyms = new Set<string>();
  const matchedTokens = new Set<string>();
  let correctedSynonym = false;

  for (const synonym of synonyms) {
    const synonymPhrase = normalizeSearchPhrase(synonym.normalizedPhrase);
    if (!synonymPhrase || synonymPhrase === 'coceira') continue;
    const synonymTokens = synonymPhrase.split(' ');
    const queryMatchesSynonym =
      normalizedKeywords.length > 0 &&
      (normalizedKeywords.every((token) => synonymTokens.includes(token)) ||
        synonymTokens.every((token) => normalizedKeywords.includes(token)));
    const typoMatchesSynonym =
      !queryMatchesSynonym &&
      normalizedKeywords.length === synonymTokens.length &&
      normalizedKeywords.every((token, index) => {
        const synonymToken = synonymTokens[index];
        return (
          token === synonymToken ||
          (token.length >= 5 &&
            synonymToken !== undefined &&
            synonymToken.length >= 5 &&
            editDistanceAtMostOne(token, synonymToken))
        );
      });
    if (!queryMatchesSynonym && !typoMatchesSynonym) continue;

    matchedSynonyms.add(synonymPhrase);
    for (const token of synonymTokens) matchedTokens.add(token);
    correctedSynonym ||= typoMatchesSynonym;
    if (synonym.category) categories.add(synonym.category);
    for (const expansion of synonym.expansions) {
      const normalizedExpansion = normalizeSearchPhrase(expansion);
      if (!normalizedExpansion) continue;
      phrases.add(normalizedExpansion);
      addTermVariants(terms, normalizedExpansion);
    }
  }

  const effectiveKeywords = correctedSynonym ? [...matchedTokens] : [...new Set([...keywords, ...matchedTokens])];
  for (const keyword of effectiveKeywords) addTermVariants(terms, keyword);
  for (const synonymPhrase of matchedSynonyms) {
    phrases.add(synonymPhrase);
    addTermVariants(terms, synonymPhrase);
  }
  const completeSynonymPhrase = [...matchedSynonyms].find((phrase) =>
    normalizedKeywords.every((token) => phrase.split(' ').includes(token)),
  );
  const normalizedQuery = correctedSynonym
    ? ([...matchedSynonyms][0] ?? normalizeSearchPhrase(query))
    : (completeSynonymPhrase ?? normalizeSearchPhrase(query));
  if (normalizedQuery) {
    phrases.add(normalizedQuery);
    addTermVariants(terms, normalizedQuery);
  }

  return {
    query: normalizedQuery,
    hasQuery: Boolean(query),
    phrases: [...phrases].filter(Boolean),
    terms: [...terms],
    // Correspondências aproximadas usam palavras inteiras e só aceitam termos de 5+ letras.
    keywords: effectiveKeywords,
    categories: [...categories],
    suggestionType: correctedSynonym ? ('correction' as const) : matchedSynonyms.size ? ('related' as const) : null,
  };
}

export function containsSearchPhrase(text: string, phrase: string): boolean {
  const normalizedText = normalizeSearchPhrase(text);
  const normalizedPhrase = normalizeSearchPhrase(phrase);
  return Boolean(normalizedPhrase && ` ${normalizedText} `.includes(` ${normalizedPhrase} `));
}

export function normalizeSearchPhrase(value: string): string {
  return normalizeSearchText(value)
    .split(' ')
    .map(singularizeToken)
    .filter((token) => token && !GENERIC_SEARCH_WORDS.has(token))
    .join(' ');
}

function addTermVariants(target: Set<string>, phrase: string): void {
  target.add(phrase);
  if (!phrase.includes(' ') && !phrase.endsWith('s')) target.add(`${phrase}s`);
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1;
}
