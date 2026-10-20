import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCatalogProduct,
  createProduct,
  createTestApp,
  prisma,
  promoteUserToAdmin,
  registerUser,
  resetDatabase,
  validProduct,
} from '../helpers.js';

const app = createTestApp();

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('catálogo de produtos', () => {
  it('cria, detalha, edita e exclui um produto', async () => {
    const user = await registerUser(app);
    await promoteUserToAdmin(user);
    const auth = { Authorization: `Bearer ${user.token}` };

    const created = await createProduct(app, user);
    expect(created.ingredients.map((item) => item.name)).toEqual(['Aqua', 'Glycerin', 'Niacinamide']);

    const detail = await request(app).get(`/api/products/${created.id}`).set(auth).expect(200);
    expect(detail.body.name).toBe('Sérum de Teste');

    const updated = await request(app)
      .put(`/api/products/${created.id}`)
      .set(auth)
      .send(validProduct({ name: 'Sérum Atualizado', ingredients: ['Glycerin', 'Panthenol'] }))
      .expect(200);
    expect(updated.body.name).toBe('Sérum Atualizado');
    expect(
      updated.body.ingredients.map((item: { name: string; position: number }) => [item.name, item.position]),
    ).toEqual([
      ['Glycerin', 1],
      ['Panthenol', 2],
    ]);

    await request(app).delete(`/api/products/${created.id}`).set(auth).expect(204);
    await request(app).get(`/api/products/${created.id}`).set(auth).expect(404);
  });

  it('retorna erros de validação por campo', async () => {
    const user = await registerUser(app);
    const forbidden = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${user.token}`)
      .send(validProduct())
      .expect(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    await promoteUserToAdmin(user);
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: '', brand: 'X', category: 'INVALIDA', ingredients: [] })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'category', 'ingredients']));
  });

  it('rejeita identificadores malformados com 400', async () => {
    const user = await registerUser(app);
    const response = await request(app)
      .get('/api/products/123')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(400);
    expect(response.body.error.details[0].field).toBe('id');
  });

  it('reutiliza ingredientes existentes sem duplicar o catálogo, inclusive por sinônimo', async () => {
    const user = await registerUser(app);
    await prisma.ingredient.create({
      data: {
        name: 'Niacinamide',
        normalizedName: 'niacinamide',
        searchTerms: ['niacinamide', 'vitamina b3'],
        isCurated: true,
      },
    });

    const first = await createProduct(app, user, { ingredients: ['Aqua', 'Glycerin', 'Vitamina B3'] });
    const second = await createProduct(app, user, { ingredients: ['AQUA', ' glycerin. ', 'Niacinamide', 'aqua'] });

    expect(first.ingredients.map((item) => item.name)).toEqual(['Aqua', 'Glycerin', 'Niacinamide']);
    expect(second.ingredients.map((item) => item.id)).toEqual(first.ingredients.map((item) => item.id));
    expect(await prisma.ingredient.count()).toBe(3);
  });

  it('busca por nome ou marca, filtra por categoria e pagina', async () => {
    const user = await registerUser(app);
    const auth = { Authorization: `Bearer ${user.token}` };
    await createProduct(app, user, { name: 'Gel de Limpeza', brand: 'Aurora', category: 'LIMPEZA' });
    await createProduct(app, user, { name: 'Sérum Noturno', brand: 'Brisa', category: 'SERUM' });
    await createProduct(app, user, { name: 'Sérum Diurno', brand: 'Aurora', category: 'SERUM' });

    const byBrand = await request(app).get('/api/products').query({ q: 'aurora' }).set(auth).expect(200);
    expect(byBrand.body.total).toBe(2);

    const byName = await request(app).get('/api/products').query({ q: 'noturno' }).set(auth).expect(200);
    expect(byName.body.items.map((item: { name: string }) => item.name)).toEqual(['Sérum Noturno']);

    const byCategory = await request(app)
      .get('/api/products')
      .query({ category: 'SERUM', pageSize: 1 })
      .set(auth)
      .expect(200);
    expect(byCategory.body).toMatchObject({ total: 2, totalPages: 2, page: 1 });
    expect(byCategory.body.items).toHaveLength(1);
    expect(byCategory.body.items[0].ingredientCount).toBe(3);
  });
});

describe('comparação de produtos', () => {
  it('compara produtos do catálogo público no servidor e registra no histórico', async () => {
    const user = await registerUser(app);
    const auth = { Authorization: `Bearer ${user.token}` };
    const a = await createCatalogProduct({ name: 'Produto A', ingredients: ['Aqua', 'Glycerin', 'Parfum'] });
    const b = await createCatalogProduct({ name: 'Produto B', ingredients: ['Aqua', 'Panthenol'] });

    const response = await request(app)
      .post('/api/comparisons')
      .set(auth)
      .send({ productAId: a.id, productBId: b.id })
      .expect(201);
    const { result } = response.body;
    expect(result.productA).toMatchObject({ id: a.id, slug: a.slug, name: 'Produto A', ingredientCount: 3 });
    expect(result.commonIngredients.map((item: { name: string }) => item.name)).toEqual(['Aqua']);
    expect(result.exclusiveToA.map((item: { name: string }) => item.name)).toEqual(['Glycerin', 'Parfum']);
    expect(result.exclusiveToB.map((item: { name: string }) => item.name)).toEqual(['Panthenol']);
    expect(result.overlapPercentage).toBe(25);
    expect(response.body.aiExplanation).toBeNull();

    const history = await request(app).get('/api/comparisons').set(auth).expect(200);
    expect(history.body.total).toBe(1);
  });

  it('não permite comparar um produto com ele mesmo', async () => {
    const user = await registerUser(app);
    const a = await createCatalogProduct();
    await request(app)
      .post('/api/comparisons')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productAId: a.id, productBId: a.id })
      .expect(400);
  });

  it('retorna 404 sem registrar histórico quando um dos produtos não existe no catálogo', async () => {
    const user = await registerUser(app);
    const a = await createCatalogProduct();
    const response = await request(app)
      .post('/api/comparisons')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ productAId: a.id, productBId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(await prisma.productComparison.count()).toBe(0);
  });
});
