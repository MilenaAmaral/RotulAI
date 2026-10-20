import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, prisma, registerUser, resetDatabase } from '../helpers.js';

const app = createTestApp();

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('favoritos', () => {
  it('exige login, isola os favoritos por usuário e torna a inclusão idempotente', async () => {
    await request(app).get('/api/favorites').expect(401);

    const user = await registerUser(app);
    const other = await registerUser(app);
    const product = await prisma.catalogProduct.create({
      data: {
        slug: 'hidratante-demonstracao',
        name: 'Hidratante de Demonstração',
        brand: 'Marca Fictícia',
        category: 'HIDRATANTE',
      },
    });

    const auth = { Authorization: `Bearer ${user.token}` };
    await request(app).put(`/api/favorites/${product.id}`).set(auth).expect(200);
    await request(app).put(`/api/favorites/${product.id}`).set(auth).expect(200);

    const list = await request(app).get('/api/favorites').set(auth).expect(200);
    expect(list.body).toMatchObject({ total: 1 });
    expect(list.body.items[0]).toMatchObject({ id: product.id, slug: product.slug, ingredientCount: 0 });

    const otherList = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${other.token}`)
      .expect(200);
    expect(otherList.body.total).toBe(0);

    await request(app).delete(`/api/favorites/${product.id}`).set('Authorization', `Bearer ${other.token}`).expect(204);
    expect(await prisma.favorite.count({ where: { catalogProductId: product.id } })).toBe(1);

    await request(app).delete(`/api/favorites/${product.id}`).set(auth).expect(204);
    expect(await prisma.favorite.count()).toBe(0);
  });

  it('não favorita um produto que não existe', async () => {
    const user = await registerUser(app);
    await request(app)
      .put('/api/favorites/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(404);
  });
});
