import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductsPanel } from './ProductsPanel';

const listItem = {
  id: 'p1',
  slug: 'marca-serum',
  name: 'Sérum',
  brand: 'Marca',
  category: 'SERUM',
  ingredientCount: 3,
};
const detail = {
  ...listItem,
  referenceUrl: null,
  ingredients: [
    { id: 'i1', name: 'Aqua', position: 1, functions: [], isCurated: true },
    { id: 'i2', name: '1,2-Hexanediol', position: 2, functions: [], isCurated: false },
    { id: 'i3', name: 'Glycerin', position: 3, functions: [], isCurated: true },
  ],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function setup() {
  const requests: Array<{ url: string; method: string; body: unknown }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    requests.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === 'GET' && url.startsWith('/api/admin/products?')) {
      return json({ items: [listItem], page: 1, pageSize: 50, total: 1, totalPages: 1, suggestions: [] });
    }
    if (url === '/api/admin/products/p1') return json(detail);
    return json({ error: { message: 'inesperado' } }, 500);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProductsPanel />
    </QueryClientProvider>,
  );
  return { requests, user: userEvent.setup() };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProductsPanel', () => {
  it('salva a edição sem quebrar nomes INCI que contêm vírgula', async () => {
    const { requests, user } = setup();

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Sérum'));
    expect(screen.getByRole('heading', { name: 'Editar produto' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(requests.some((request) => request.method === 'PUT')).toBe(true));
    const update = requests.find((request) => request.method === 'PUT');
    expect(update?.url).toBe('/api/admin/products/p1');
    expect(update?.body).toEqual({
      name: 'Sérum',
      brand: 'Marca',
      category: 'SERUM',
      referenceUrl: null,
      ingredients: ['Aqua', '1,2-Hexanediol', 'Glycerin'],
    });
  });

  it('mantém o modo de edição quando a busca esconde o produto da lista', async () => {
    const { user } = setup();

    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Sérum'));
    await user.type(screen.getByRole('textbox', { name: 'Buscar produtos' }), 'outro termo');

    expect(screen.getByRole('heading', { name: 'Editar produto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  });
});
