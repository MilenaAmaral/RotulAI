import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { TestUser } from '../helpers.js';
import {
  createCatalogProduct,
  createProduct,
  createTestApp,
  prisma,
  promoteUserToAdmin,
  registerUser,
  replyWith,
  resetDatabase,
  validProduct,
} from '../helpers.js';

const app: Express = createTestApp(replyWith('Resposta educacional de teste.'));

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });

describe('isolamento de dados entre usuários', () => {
  it('impede ler, editar ou excluir produtos de outro usuário alterando o id', async () => {
    const owner = await registerUser(app, 'Dona');
    const intruder = await registerUser(app, 'Intrusa');
    await promoteUserToAdmin(owner);
    await promoteUserToAdmin(intruder);
    const product = await createProduct(app, owner, { name: 'Produto Privado' });

    await request(app).get(`/api/products/${product.id}`).set(as(intruder)).expect(404);
    await request(app)
      .put(`/api/products/${product.id}`)
      .set(as(intruder))
      .send(validProduct({ name: 'Hackeado' }))
      .expect(404);
    await request(app).delete(`/api/products/${product.id}`).set(as(intruder)).expect(404);

    const list = await request(app).get('/api/products').set(as(intruder)).expect(200);
    expect(list.body.total).toBe(0);

    const stillThere = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(stillThere.name).toBe('Produto Privado');
  });

  it('nunca usa produtos pessoais (de outro usuário ou próprios) na comparação ou no contexto da IA', async () => {
    const owner = await registerUser(app);
    const intruder = await registerUser(app);
    const foreign = await createProduct(app, owner);
    const own = await createProduct(app, intruder);
    const publicProduct = await createCatalogProduct();

    for (const privateId of [foreign.id, own.id]) {
      await request(app)
        .post('/api/comparisons')
        .set(as(intruder))
        .send({ productAId: publicProduct.id, productBId: privateId })
        .expect(404);
      await request(app)
        .post('/api/conversations')
        .set(as(intruder))
        .send({ message: 'Compare os produtos', productIds: [privateId] })
        .expect(404);
    }
    expect(await prisma.productComparison.count()).toBe(0);
    expect(await prisma.conversation.count()).toBe(0);
  });

  it('impede acessar ou excluir históricos de outro usuário', async () => {
    const owner = await registerUser(app);
    const intruder = await registerUser(app);

    const lookup = await request(app)
      .post('/api/ingredient-analyses')
      .set(as(owner))
      .send({ query: 'Glycerin' })
      .expect(201);
    const conversation = await request(app)
      .post('/api/conversations')
      .set(as(owner))
      .send({ message: 'O que é glicerina?' })
      .expect(201);
    const a = await createCatalogProduct();
    const b = await createCatalogProduct({ name: 'Outro' });
    const comparison = await request(app)
      .post('/api/comparisons')
      .set(as(owner))
      .send({ productAId: a.id, productBId: b.id })
      .expect(201);

    for (const path of [
      `/api/ingredient-analyses/${lookup.body.id}`,
      `/api/conversations/${conversation.body.id}`,
      `/api/comparisons/${comparison.body.id}`,
    ]) {
      await request(app).get(path).set(as(intruder)).expect(404);
      await request(app).delete(path).set(as(intruder)).expect(404);
    }
    await request(app)
      .post(`/api/conversations/${conversation.body.id}/messages`)
      .set(as(intruder))
      .send({ message: 'oi' })
      .expect(404);
    await request(app).post(`/api/ingredient-analyses/${lookup.body.id}/explanation`).set(as(intruder)).expect(404);

    // "Limpar histórico" de um usuário não afeta o outro.
    await request(app).delete('/api/ingredient-analyses').set(as(intruder)).expect(200);
    await request(app).delete('/api/conversations').set(as(intruder)).expect(200);
    await request(app).delete('/api/comparisons').set(as(intruder)).expect(200);

    expect(await prisma.ingredientAnalysis.count({ where: { userId: owner.id } })).toBe(1);
    expect(await prisma.conversation.count({ where: { userId: owner.id } })).toBe(1);
    expect(await prisma.productComparison.count({ where: { userId: owner.id } })).toBe(1);
  });

  it('o dashboard mostra apenas números do próprio usuário', async () => {
    const owner = await registerUser(app);
    const other = await registerUser(app);
    await createProduct(app, owner);
    await createProduct(app, owner, { name: 'Segundo' });

    const dashboard = await request(app).get('/api/dashboard').set(as(other)).expect(200);
    expect(dashboard.body.stats).toMatchObject({ products: 0, ingredientLookups: 0, comparisons: 0, conversations: 0 });
    expect(dashboard.body.recentActivity).toEqual([]);
  });
});
