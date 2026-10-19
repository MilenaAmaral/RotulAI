import { describe, expect, it } from 'vitest';
import { containsSearchPhrase, normalizeSearchText, searchTokens } from '../../src/modules/catalog/search-normalization.js';

describe('normalização de busca do catálogo', () => {
  it('remove diacríticos, normaliza separadores e não depende da ordem das palavras', () => {
    expect(normalizeSearchText('  Ácido   Hialurônico ')).toBe('acido hialuronico');
    expect(searchTokens('La Roche-Posay')).toEqual(['la', 'roche', 'posay']);
  });

  it('verifica sinônimos como frases completas, sem casar fragmentos de palavras', () => {
    expect(containsSearchPhrase('serave hidratante', 'serave')).toBe(true);
    expect(containsSearchPhrase('acneica', 'acne')).toBe(false);
  });
});
