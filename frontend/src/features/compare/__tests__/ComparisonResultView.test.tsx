import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ComparisonResult } from '../../../types/api';
import { ComparisonResultView } from '../ComparisonResultView';

const result: ComparisonResult = {
  productA: { id: 'a', name: 'Sérum A', brand: 'Aurora', category: 'SERUM', description: null, ingredientCount: 3 },
  productB: {
    id: 'b',
    name: 'Creme B',
    brand: 'Brisa',
    category: 'HIDRATANTE',
    description: 'Descrição B',
    ingredientCount: 2,
  },
  sameBrand: false,
  sameCategory: false,
  commonIngredients: [{ id: 'aqua', name: 'Aqua', positionA: 1, positionB: 1 }],
  exclusiveToA: [
    { id: 'gly', name: 'Glycerin', position: 2 },
    { id: 'nia', name: 'Niacinamide', position: 3 },
  ],
  exclusiveToB: [{ id: 'pan', name: 'Panthenol', position: 2 }],
  overlapPercentage: 25,
};

describe('ComparisonResultView', () => {
  it('apresenta os grupos de ingredientes calculados pelo servidor', () => {
    render(
      <MemoryRouter>
        <ComparisonResultView result={result} />
      </MemoryRouter>,
    );

    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Ingredientes em comum' })).getByText('Aqua')).toBeInTheDocument();
    const exclusiveA = within(screen.getByRole('list', { name: 'Exclusivos de Sérum A' }));
    expect(exclusiveA.getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(screen.getByRole('list', { name: 'Exclusivos de Creme B' })).getByText('Panthenol'),
    ).toBeInTheDocument();
    expect(screen.getByText('Marca diferente')).toBeInTheDocument();
    expect(screen.getByText('Categoria diferente')).toBeInTheDocument();
  });

  it('deixa claro que a sobreposição não indica qual produto é melhor', () => {
    render(
      <MemoryRouter>
        <ComparisonResultView result={result} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/não indica qualidade, eficácia nem qual produto/)).toBeInTheDocument();
  });
});
