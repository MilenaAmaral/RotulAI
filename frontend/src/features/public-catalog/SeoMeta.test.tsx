import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SeoMeta } from './SeoMeta';

describe('SeoMeta', () => {
  it('updates title, descriptions, social metadata and canonical url', () => {
    render(
      <SeoMeta
        title="Produto teste | Rotulai"
        description="Referência educativa de produto."
        canonicalPath="/catalogo/produtos/produto-teste"
      />,
    );

    expect(document.title).toBe('Produto teste | Rotulai');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Referência educativa de produto.',
    );
    expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Produto teste | Rotulai',
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${window.location.origin}/catalogo/produtos/produto-teste`,
    );
  });
});
