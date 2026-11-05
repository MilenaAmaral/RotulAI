import { describe, expect, it } from 'vitest';
import { CATALOG_SEARCH_SYNONYMS } from '../../prisma/search-synonyms.js';
import {
  containsSearchPhrase,
  expandSearchQuery,
  normalizeSearchText,
  searchKeywords,
  searchTokens,
} from '../../src/modules/catalog/search-normalization.js';

describe('normalização de busca do catálogo', () => {
  it('remove diacríticos, normaliza separadores e não depende da ordem das palavras', () => {
    expect(normalizeSearchText('  Ácido   Hialurônico ')).toBe('acido hialuronico');
    expect(searchTokens('La Roche-Posay')).toEqual(['la', 'roche', 'posay']);
  });

  it('verifica sinônimos como frases completas, sem casar fragmentos de palavras', () => {
    expect(containsSearchPhrase('serave hidratante', 'serave')).toBe(true);
    expect(containsSearchPhrase('acneica', 'acne')).toBe(false);
    expect(containsSearchPhrase('solution solaire', 'sol')).toBe(false);
  });

  it('descarta palavras genéricas que casavam com quase todo o catálogo', () => {
    expect(searchKeywords('Pele oleosa com espinhas')).toEqual(['oleosa', 'espinha']);
    expect(searchKeywords('protetor para o rosto')).toEqual(['protetor']);
    expect(searchKeywords('de da do para com a o e')).toEqual([]);
  });

  it('expande sinônimos como frases inteiras e só usa as palavras digitadas na busca de ingredientes', () => {
    const result = expandSearchQuery('Ácido hialurônico', [
      { normalizedPhrase: 'acido hialuronico', expansions: ['Hyaluronic Acid', 'sodium hyaluronate'], category: null },
      { normalizedPhrase: 'protetor solar', expansions: ['sunscreen'], category: 'PROTETOR_SOLAR' },
    ]);

    expect(result.query).toBe('hialuronico');
    expect(result.keywords).toEqual(['hialuronico']);
    expect(result.terms).toContain('hyaluronic acid');
    expect(result.terms).toContain('sodium hyaluronate');
    expect(result.terms).toContain('hialuronico');
    expect(result.terms).not.toContain('acid');
    expect(result.phrases).toContain('hyaluronic acid');
    expect(result.phrases).toContain('sodium hyaluronate');
    expect(result.categories).toEqual([]);
  });

  it('unifica singular, plural e buscas com um termo incompleto do dicionário', () => {
    const synonyms = [
      { normalizedPhrase: 'rugas', expansions: ['retinol'], category: null },
      { normalizedPhrase: 'espinha', expansions: ['acne'], category: null },
      { normalizedPhrase: 'espinhas', expansions: ['normaderm'], category: null },
      { normalizedPhrase: 'protetor solar', expansions: ['sunscreen'], category: 'PROTETOR_SOLAR' },
    ];

    expect(expandSearchQuery('ruga', synonyms)).toEqual(expandSearchQuery('rugas', synonyms));
    expect(expandSearchQuery('espinha', synonyms)).toEqual(expandSearchQuery('espinhas', synonyms));
    expect(expandSearchQuery('espina', synonyms).terms).toEqual(expandSearchQuery('espinha', synonyms).terms);
    expect(expandSearchQuery('espina', synonyms).suggestionType).toBe('correction');
    expect(expandSearchQuery('espinha', synonyms).suggestionType).toBe('related');
    expect(expandSearchQuery('protetor', synonyms)).toEqual(expandSearchQuery('protetor solar', synonyms));
    expect(expandSearchQuery('proteor solar', synonyms)).toMatchObject({
      categories: ['PROTETOR_SOLAR'],
      suggestionType: 'correction',
    });
  });

  it('não expande coceira', () => {
    expect(
      expandSearchQuery('coceira', [{ normalizedPhrase: 'coceira', expansions: ['cleanser'], category: null }]),
    ).toMatchObject({ categories: [], suggestionType: null });
    expect(
      expandSearchQuery('coceira', [{ normalizedPhrase: 'coceira', expansions: ['cleanser'], category: null }]).terms,
    ).not.toContain('cleanser');
  });

  it('mantém o dicionário normalizado e agrega os sinônimos singulares/plurais', () => {
    const normalizedPhrases = CATALOG_SEARCH_SYNONYMS.map((item) => item.normalizedPhrase);
    const espinha = CATALOG_SEARCH_SYNONYMS.find((item) => item.normalizedPhrase === 'espinha');

    expect(new Set(normalizedPhrases).size).toBe(normalizedPhrases.length);
    expect(espinha?.expansions).toContain('acne');
    expect(espinha?.expansions).toContain('normaderm');
    expect(CATALOG_SEARCH_SYNONYMS.some((item) => item.normalizedPhrase === 'coceira')).toBe(false);
    expect(CATALOG_SEARCH_SYNONYMS.some((item) => item.normalizedPhrase === 'linha expressao')).toBe(true);
    expect(CATALOG_SEARCH_SYNONYMS.some((item) => item.normalizedPhrase === 'cicatriz')).toBe(true);
    expect(CATALOG_SEARCH_SYNONYMS.some((item) => item.normalizedPhrase === 'marca espinha')).toBe(true);
  });
});
