import { describe, expect, it } from 'vitest';
import {
  cleanDisplayName,
  normalizeIngredientName,
  uniqueIngredientNames,
} from '../../src/modules/ingredients/ingredient-names.js';

describe('normalização de ingredientes', () => {
  it('ignora maiúsculas, espaços extras e pontuação final', () => {
    expect(normalizeIngredientName('  GLYCERIN.  ')).toBe('glycerin');
    expect(normalizeIngredientName('Sodium   Hyaluronate;')).toBe('sodium hyaluronate');
  });

  it('preserva vírgulas internas de nomes químicos', () => {
    expect(normalizeIngredientName('1,2-Hexanediol')).toBe('1,2-hexanediol');
  });

  it('mantém o nome de exibição do rótulo', () => {
    expect(cleanDisplayName('  Alcohol   Denat. ')).toBe('Alcohol Denat');
  });

  it('remove duplicados e vazios mantendo a primeira ocorrência', () => {
    const result = uniqueIngredientNames(['Aqua', 'aqua ', '', '  ', 'Glycerin', 'AQUA.']);
    expect(result).toEqual([
      { displayName: 'Aqua', normalizedName: 'aqua' },
      { displayName: 'Glycerin', normalizedName: 'glycerin' },
    ]);
  });
});
