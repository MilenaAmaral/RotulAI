import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { productInputSchema } from '../../src/modules/products/products.schemas.js';

interface CatalogFile {
  source: string;
  retrievedAt: string;
  products: Array<{ brand: string; name: string; category: string; referenceUrl: string; ingredients: string[] }>;
}

const catalog = JSON.parse(
  readFileSync(new URL('../../prisma/data/catalogo-produtos.json', import.meta.url), 'utf8'),
) as CatalogFile;

describe('catálogo de demonstração', () => {
  it('tem pelo menos 100 produtos sem nomes repetidos', () => {
    expect(catalog.products.length).toBeGreaterThanOrEqual(100);
    const names = catalog.products.map((product) => product.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('registra uma fonte https para cada lista de ingredientes', () => {
    expect(catalog.source).toBeTruthy();
    expect(catalog.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const product of catalog.products) {
      expect(product.referenceUrl, product.name).toMatch(/^https:\/\//);
    }
  });

  it('respeita as mesmas regras de validação do cadastro pela API', () => {
    for (const product of catalog.products) {
      const result = productInputSchema.safeParse({ ...product, description: null, imageUrl: null });
      expect(result.success, `${product.name}: ${result.success ? '' : result.error.message}`).toBe(true);
    }
  });
});
