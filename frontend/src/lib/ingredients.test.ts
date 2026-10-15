import { describe, expect, it } from 'vitest';
import { parseIngredientText } from './ingredients';

describe('parseIngredientText', () => {
  it('separa por vírgula, ponto e vírgula e quebra de linha', () => {
    expect(parseIngredientText('Aqua, Glycerin; Niacinamide\nPanthenol.')).toEqual([
      'Aqua',
      'Glycerin',
      'Niacinamide',
      'Panthenol',
    ]);
  });

  it('preserva vírgulas internas de nomes químicos', () => {
    expect(parseIngredientText('Aqua, 1,2-Hexanediol, Glycerin')).toEqual(['Aqua', '1,2-Hexanediol', 'Glycerin']);
  });

  it('remove vazios e duplicados ignorando maiúsculas', () => {
    expect(parseIngredientText('Aqua,, AQUA ,  glycerin, Glycerin')).toEqual(['Aqua', 'glycerin']);
  });
});
