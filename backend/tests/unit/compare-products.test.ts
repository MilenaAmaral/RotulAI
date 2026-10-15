import { describe, expect, it } from 'vitest';
import type { ComparableProduct } from '../../src/modules/comparisons/compare-products.js';
import { compareProducts } from '../../src/modules/comparisons/compare-products.js';

const product = (id: string, names: string[], overrides: Partial<ComparableProduct> = {}): ComparableProduct => ({
  id,
  name: `Produto ${id}`,
  brand: 'Marca X',
  category: 'SERUM',
  description: null,
  ingredients: names.map((name, index) => ({ id: name.toLowerCase(), name, position: index + 1 })),
  ...overrides,
});

describe('compareProducts', () => {
  it('separa ingredientes em comum e exclusivos preservando a ordem do rótulo', () => {
    const result = compareProducts(
      product('a', ['Aqua', 'Glycerin', 'Niacinamide', 'Parfum']),
      product('b', ['Aqua', 'Niacinamide', 'Panthenol']),
    );

    expect(result.commonIngredients).toEqual([
      { id: 'aqua', name: 'Aqua', positionA: 1, positionB: 1 },
      { id: 'niacinamide', name: 'Niacinamide', positionA: 3, positionB: 2 },
    ]);
    expect(result.exclusiveToA.map((item) => item.name)).toEqual(['Glycerin', 'Parfum']);
    expect(result.exclusiveToB.map((item) => item.name)).toEqual(['Panthenol']);
  });

  it('calcula a sobreposição pelo índice de Jaccard (comuns / união)', () => {
    const result = compareProducts(product('a', ['A', 'B', 'C']), product('b', ['B', 'C', 'D']));
    // 2 em comum / 4 na união = 50%
    expect(result.overlapPercentage).toBe(50);
  });

  it('retorna 100% para listas idênticas e 0% para listas sem interseção', () => {
    expect(compareProducts(product('a', ['A', 'B']), product('b', ['B', 'A'])).overlapPercentage).toBe(100);
    expect(compareProducts(product('a', ['A']), product('b', ['Z'])).overlapPercentage).toBe(0);
  });

  it('trata produtos sem ingredientes sem divisão por zero', () => {
    const result = compareProducts(product('a', []), product('b', []));
    expect(result.overlapPercentage).toBe(0);
    expect(result.commonIngredients).toHaveLength(0);
  });

  it('compara marca sem diferenciar maiúsculas e espaços, e categoria exata', () => {
    const result = compareProducts(
      product('a', ['A'], { brand: ' Aurora ', category: 'SERUM' }),
      product('b', ['A'], { brand: 'aurora', category: 'HIDRATANTE' }),
    );
    expect(result.sameBrand).toBe(true);
    expect(result.sameCategory).toBe(false);
  });

  it('ordena por posição mesmo quando a entrada vem desordenada', () => {
    const a = product('a', ['A', 'B']);
    a.ingredients.reverse();
    const result = compareProducts(a, product('b', ['C']));
    expect(result.exclusiveToA.map((item) => item.position)).toEqual([1, 2]);
  });

  it('não emite julgamento de qual produto é melhor', () => {
    const result = compareProducts(product('a', ['A']), product('b', ['B']));
    expect(Object.keys(result)).not.toContain('winner');
    expect(Object.keys(result)).not.toContain('best');
  });
});
