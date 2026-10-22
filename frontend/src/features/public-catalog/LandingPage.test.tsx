import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

const { usePublicProducts } = vi.hoisted(() => ({ usePublicProducts: vi.fn() }));

vi.mock('../../lib/queries', () => ({ usePublicProducts }));

describe('LandingPage', () => {
  beforeEach(() => {
    usePublicProducts.mockReset();
  });

  it('renders public products and links to their public details', () => {
    usePublicProducts.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        total: 1,
        items: [
          {
            id: 'product-1',
            slug: 'produto-de-teste',
            name: 'Produto de teste',
            brand: 'Marca de teste',
            category: 'LIMPEZA',
            ingredientCount: 12,
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Entenda o que existe nos produtos que você consome.' })).toBeVisible();
    expect(screen.getByText('Produto de teste')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver informações públicas' })).toHaveAttribute(
      'href',
      '/catalogo/produtos/produto-de-teste',
    );
  });

  it('shows a development state when the public catalog is empty', () => {
    usePublicProducts.mockReturnValue({
      isPending: false,
      isError: false,
      data: { total: 0, items: [] },
    });

    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Nosso catálogo está em desenvolvimento')).toBeVisible();
  });
});
