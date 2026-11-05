import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { PublicProductPage } from './PublicProductPage';

const { usePublicProduct, useAuth } = vi.hoisted(() => ({
  usePublicProduct: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('../../lib/queries', () => ({ usePublicProduct }));
vi.mock('../../auth/auth-context', () => ({ useAuth }));

describe('PublicProductPage', () => {
  beforeEach(() => {
    usePublicProduct.mockReset();
    useAuth.mockReturnValue({ status: 'anonymous' });
  });

  it('offers a catalog link instead of retrying when the product does not exist', () => {
    usePublicProduct.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new ApiError(404, 'NOT_FOUND', 'Produto não encontrado.'),
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/catalogo/produtos/xyz']}>
        <Routes>
          <Route path="/catalogo/produtos/:slug" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Este produto não existe ou foi removido.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toHaveAttribute('href', '/catalogo');
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });
});
