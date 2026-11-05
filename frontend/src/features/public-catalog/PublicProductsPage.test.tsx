import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicProductsPage } from './PublicProductsPage';

const { usePublicProducts } = vi.hoisted(() => ({ usePublicProducts: vi.fn() }));

vi.mock('../../lib/queries', () => ({ usePublicProducts }));
vi.mock('./FavoriteButton', () => ({ FavoriteButton: () => null }));

const product = {
  id: 'product-1',
  slug: 'produto-teste',
  name: 'Produto teste',
  brand: 'Marca teste',
  category: 'SERUM',
  ingredientCount: 2,
};

describe('PublicProductsPage', () => {
  beforeEach(() => {
    usePublicProducts.mockReset();
  });

  it('substitui os resultados antigos pelo carregamento durante uma nova busca', () => {
    usePublicProducts.mockReturnValue({
      isLoading: false,
      isFetching: true,
      isPlaceholderData: true,
      isError: false,
      data: { total: 101, items: [product], suggestions: [], page: 1, totalPages: 9 },
    });

    render(
      <MemoryRouter initialEntries={['/catalogo?q=espinha']}>
        <PublicProductsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Carregando produtos...');
    expect(screen.queryByText('101 produtos')).not.toBeInTheDocument();
    expect(screen.queryByText('Produto teste')).not.toBeInTheDocument();
  });

  it('identifica resultados relacionados e evita repetir produtos na caixa do mobile', () => {
    usePublicProducts.mockReturnValue({
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      data: {
        total: 1,
        items: [product],
        suggestions: [product],
        suggestionType: 'related',
        page: 1,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter initialEntries={['/catalogo?q=espinha']}>
        <PublicProductsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Produtos relacionados a "espinha"' })).toBeVisible();
    const suggestion = screen
      .getByRole('heading', { name: 'Produtos relacionados a "espinha"' })
      .closest('section')
      ?.querySelector('li');
    expect(suggestion).toHaveClass('hidden', 'sm:list-item');
    expect(screen.getByText('Os produtos relacionados já aparecem na lista abaixo.')).toBeVisible();
  });

  it('mantém a mensagem de correção apenas para erros de digitação', () => {
    usePublicProducts.mockReturnValue({
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      isError: false,
      data: {
        total: 1,
        items: [product],
        suggestions: [product],
        suggestionType: 'correction',
        page: 1,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter initialEntries={['/catalogo?q=espina']}>
        <PublicProductsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Você quis dizer...' })).toBeVisible();
  });
});
