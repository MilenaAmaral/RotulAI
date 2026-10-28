import { describe, expect, it } from 'vitest';
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
  });

  it('descarta palavras genéricas que casavam com quase todo o catálogo', () => {
    expect(searchKeywords('Pele oleosa com espinhas')).toEqual(['oleosa', 'espinhas']);
    expect(searchKeywords('protetor para o rosto')).toEqual(['protetor']);
  });

  it('expande sinônimos como frases inteiras e só usa as palavras digitadas na busca de ingredientes', () => {
    const result = expandSearchQuery('Ácido hialurônico', [
      { normalizedPhrase: 'acido hialuronico', expansions: ['Hyaluronic Acid', 'sodium hyaluronate'], category: null },
      { normalizedPhrase: 'protetor solar', expansions: ['sunscreen'], category: 'PROTETOR_SOLAR' },
    ]);

    expect(result.query).toBe('acido hialuronico');
    expect(result.keywords).toEqual(['hialuronico']);
    expect(result.terms).toEqual(['hialuronico', 'hyaluronic acid', 'sodium hyaluronate']);
    expect(result.terms).not.toContain('acid');
    expect(result.phrases).toEqual(['acido hialuronico', 'hyaluronic acid', 'sodium hyaluronate']);
    expect(result.categories).toEqual([]);
  });
});
