import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeExpiredHistory } from '../../src/modules/history/retention.js';
import { createProduct, createTestApp, prisma, registerUser, resetDatabase } from '../helpers.js';

const app = createTestApp();

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('sistema', () => {
  it('health check verifica o banco', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'ok', ai: 'disabled' });
  });

  it('responde 404 em JSON para rotas inexistentes', async () => {
    const response = await request(app).get('/api/rota-inexistente').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    const outside = await request(app).get('/nada').expect(404);
    expect(outside.body.error.code).toBe('NOT_FOUND');
  });

  it('trata JSON malformado sem expor detalhes internos', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(response.body.error.message).toBe('JSON inválido.');
    expect(JSON.stringify(response.body)).not.toContain('stack');
  });

  it('aplica cabeçalhos de segurança e CORS apenas para origens permitidas', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173').expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['x-powered-by']).toBeUndefined();

    const blocked = await request(app).get('/api/health').set('Origin', 'https://site-malicioso.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('publica a especificação OpenAPI', async () => {
    const response = await request(app).get('/api/docs.json').expect(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining(['/products', '/comparisons', '/conversations']),
    );
  });
});

describe('retenção de dados', () => {
  it('remove históricos expirados e preserva registros recentes e produtos', async () => {
    const user = await registerUser(app);
    await createProduct(app, user);
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);

    await prisma.ingredientAnalysis.createMany({
      data: [
        { userId: user.id, query: 'antiga', foundInCatalog: false, createdAt: old },
        { userId: user.id, query: 'recente', foundInCatalog: false },
      ],
    });
    await prisma.conversation.create({ data: { userId: user.id, title: 'Antiga', updatedAt: old, createdAt: old } });
    await prisma.conversation.create({ data: { userId: user.id, title: 'Recente' } });

    const removed = await purgeExpiredHistory(180);

    expect(removed.analyses).toBe(1);
    expect(removed.conversations).toBe(1);
    expect((await prisma.ingredientAnalysis.findMany()).map((item) => item.query)).toEqual(['recente']);
    expect((await prisma.conversation.findMany()).map((item) => item.title)).toEqual(['Recente']);
    expect(await prisma.product.count()).toBe(1);
  });
});
