import { describe, expect, it } from 'vitest';
import { productInputSchema } from '../../src/modules/products/products.schemas.js';

const base = {
  name: 'Creme Teste',
  brand: 'Marca',
  category: 'HIDRATANTE',
  ingredients: ['Aqua'],
};

const issuesFor = (input: unknown) => {
  const result = productInputSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('validação de cadastro de produtos', () => {
  it('aceita um produto válido e converte campos opcionais vazios em null', () => {
    const parsed = productInputSchema.parse({ ...base, description: '   ', imageUrl: '' });
    expect(parsed.description).toBeNull();
    expect(parsed.imageUrl).toBeNull();
    expect(parsed.name).toBe('Creme Teste');
  });

  it('exige nome, marca, categoria válida e ao menos um ingrediente', () => {
    expect(issuesFor({ ...base, name: 'A' })).toContain('name');
    expect(issuesFor({ ...base, brand: '  ' })).toContain('brand');
    expect(issuesFor({ ...base, category: 'MAQUIAGEM' })).toContain('category');
    expect(issuesFor({ ...base, ingredients: [] })).toContain('ingredients');
  });

  it('rejeita URLs de imagem que não usam https', () => {
    expect(issuesFor({ ...base, imageUrl: 'http://exemplo.com/a.png' })).toContain('imageUrl');
    expect(issuesFor({ ...base, imageUrl: 'javascript:alert(1)' })).toContain('imageUrl');
    expect(issuesFor({ ...base, imageUrl: 'https://exemplo.com/a.png' })).toEqual([]);
  });

  it('aceita fonte da lista apenas com https', () => {
    expect(issuesFor({ ...base, referenceUrl: 'http://exemplo.com' })).toContain('referenceUrl');
    expect(issuesFor({ ...base, referenceUrl: 'https://exemplo.com/produto' })).toEqual([]);
  });

  it('limita a quantidade e o tamanho dos ingredientes', () => {
    expect(issuesFor({ ...base, ingredients: Array.from({ length: 101 }, (_, i) => `Ing ${i}`) })).toContain(
      'ingredients',
    );
    expect(issuesFor({ ...base, ingredients: ['x'.repeat(121)] })).toContain('ingredients.0');
  });
});
