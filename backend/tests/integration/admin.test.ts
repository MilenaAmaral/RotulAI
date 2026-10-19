import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AccessProfile } from '../../src/generated/prisma/enums.js';
import { createTestApp, prisma, registerUser, resetDatabase } from '../helpers.js';

const app = createTestApp();

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('autorização administrativa', () => {
  it('rejeita visitantes e bloqueia Free em todas as rotas de administração', async () => {
    await request(app).get('/api/admin/products').expect(401);

    const free = await registerUser(app);
    const auth = { Authorization: `Bearer ${free.token}` };
    const requests = [
      () => request(app).get('/api/admin/products'),
      () => request(app).post('/api/admin/products').send({}),
      () => request(app).get('/api/admin/products/not-a-uuid'),
      () => request(app).put('/api/admin/products/not-a-uuid').send({}),
      () => request(app).delete('/api/admin/products/not-a-uuid'),
      () => request(app).get('/api/admin/ingredients'),
      () => request(app).post('/api/admin/ingredients').send({}),
      () => request(app).put('/api/admin/ingredients/not-a-uuid').send({}),
      () => request(app).delete('/api/admin/ingredients/not-a-uuid'),
      () => request(app).get('/api/admin/search-synonyms'),
      () => request(app).post('/api/admin/search-synonyms').send({}),
      () => request(app).put('/api/admin/search-synonyms/not-a-uuid').send({}),
      () => request(app).delete('/api/admin/search-synonyms/not-a-uuid'),
      () => request(app).get('/api/admin/recommendation-rules'),
      () => request(app).post('/api/admin/recommendation-rules').send({}),
      () => request(app).put('/api/admin/recommendation-rules/not-a-uuid').send({}),
      () => request(app).delete('/api/admin/recommendation-rules/not-a-uuid'),
      () => request(app).post('/api/products').send({}),
      () => request(app).put('/api/products/not-a-uuid').send({}),
      () => request(app).delete('/api/products/not-a-uuid'),
    ];

    for (const makeRequest of requests) {
      await makeRequest().set(auth).expect(403);
    }
  });

  it('permite ao Admin criar, editar, consultar e excluir os recursos curados', async () => {
    const admin = await registerUser(app);
    await prisma.user.update({ where: { id: admin.id }, data: { role: AccessProfile.ADMIN } });
    const auth = { Authorization: `Bearer ${admin.token}` };

    const ingredient = await request(app)
      .post('/api/admin/ingredients')
      .set(auth)
      .send({
        name: 'Niacinamide',
        synonyms: ['Vitamin B3'],
        functions: ['Condicionante da pele'],
        description: 'Ingrediente de referência.',
        usageInfo: 'Usado em cosméticos.',
        cautions: 'A tolerância individual varia.',
        sources: [{ title: 'Referência', publisher: 'Rotulai', url: 'https://example.org/niacinamide' }],
      })
      .expect(201);
    expect(ingredient.body).toMatchObject({ normalizedName: 'niacinamide', isCurated: true });

    const product = await request(app)
      .post('/api/admin/products')
      .set(auth)
      .send({
        name: 'Sérum de Teste',
        brand: 'Marca Fictícia',
        category: 'SERUM',
        referenceUrl: 'https://example.org/serum',
        ingredients: ['Niacinamide'],
      })
      .expect(201);
    expect(product.body.ingredients.map((item: { name: string }) => item.name)).toEqual(['Niacinamide']);

    const rule = await request(app)
      .post('/api/admin/recommendation-rules')
      .set(auth)
      .send({
        ingredientId: ingredient.body.id,
        skinType: 'OILY',
        concern: 'ACNE_PRONE',
        rationale: 'Contém niacinamida.',
        justification: 'Regra demonstrativa baseada na referência curada do ingrediente.',
      })
      .expect(201);
    const updatedRule = await request(app)
      .put(`/api/admin/recommendation-rules/${rule.body.id}`)
      .set(auth)
      .send({
        ingredientId: ingredient.body.id,
        skinType: 'OILY',
        concern: 'ACNE_PRONE',
        rationale: 'Contém niacinamida na lista.',
        justification: 'Justificativa revisada e versionada para a referência do ingrediente.',
      })
      .expect(200);
    expect(updatedRule.body.version).toBe(2);

    const synonym = await request(app)
      .post('/api/admin/search-synonyms')
      .set(auth)
      .send({ phrase: 'filtro solar', expansions: ['protetor solar'], category: 'PROTETOR_SOLAR' })
      .expect(201);
    expect(synonym.body.normalizedPhrase).toBe('filtro solar');

    await request(app).get('/api/admin/products').set(auth).expect(200);
    await request(app).get(`/api/admin/products/${product.body.id}`).set(auth).expect(200);
    await request(app).get('/api/admin/ingredients').set(auth).expect(200);
    await request(app).get('/api/admin/search-synonyms').set(auth).expect(200);
    await request(app).get('/api/admin/recommendation-rules').set(auth).expect(200);

    await request(app).delete(`/api/admin/recommendation-rules/${rule.body.id}`).set(auth).expect(204);
    await request(app).delete(`/api/admin/search-synonyms/${synonym.body.id}`).set(auth).expect(204);
    await request(app).delete(`/api/admin/products/${product.body.id}`).set(auth).expect(204);
    await request(app).delete(`/api/admin/ingredients/${ingredient.body.id}`).set(auth).expect(204);
  });
});
