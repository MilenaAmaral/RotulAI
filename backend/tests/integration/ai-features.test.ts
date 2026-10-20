import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { LlmProviderError } from '../../src/modules/ai/llm-provider.js';
import {
  createCatalogProduct,
  createProduct,
  createTestApp,
  FakeLlmProvider,
  prisma,
  registerUser,
  replyWith,
  resetDatabase,
} from '../helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('assistente sem IA configurada', () => {
  const app = createTestApp(null);

  it('informa como habilitar e mantém as demais áreas funcionando', async () => {
    const user = await registerUser(app);
    const auth = { Authorization: `Bearer ${user.token}` };

    const status = await request(app).get('/api/ai/status').set(auth).expect(200);
    expect(status.body.enabled).toBe(false);
    expect(status.body.setupInstructions).toContain('ANTHROPIC_API_KEY');

    const chat = await request(app).post('/api/conversations').set(auth).send({ message: 'Olá' }).expect(503);
    expect(chat.body.error.code).toBe('AI_NOT_CONFIGURED');
    expect(await prisma.conversation.count()).toBe(0);

    await createProduct(app, user);
    await request(app).post('/api/ingredient-analyses').set(auth).send({ query: 'Glycerin' }).expect(201);
    await request(app).get('/api/dashboard').set(auth).expect(200);
  });
});

describe('assistente com IA', () => {
  it('cria conversa, persiste mensagens e envia histórico nas mensagens seguintes', async () => {
    const provider = replyWith('A glicerina é um umectante.');
    const app = createTestApp(provider);
    const user = await registerUser(app);
    const auth = { Authorization: `Bearer ${user.token}` };

    const created = await request(app)
      .post('/api/conversations')
      .set(auth)
      .send({ message: 'O que é glicerina?' })
      .expect(201);
    expect(created.body.title).toBe('O que é glicerina?');
    expect(created.body.messages.map((m: { role: string }) => m.role)).toEqual(['USER', 'ASSISTANT']);
    expect(created.body.messages[1].content).toBe('A glicerina é um umectante.');

    await request(app)
      .post(`/api/conversations/${created.body.id}/messages`)
      .set(auth)
      .send({ message: 'E a niacinamida?' })
      .expect(201);
    expect(provider.calls[1]?.messages.map((m) => m.content)).toEqual([
      'O que é glicerina?',
      'A glicerina é um umectante.',
      'E a niacinamida?',
    ]);

    const detail = await request(app).get(`/api/conversations/${created.body.id}`).set(auth).expect(200);
    expect(detail.body.messages).toHaveLength(4);
  });

  it('inclui dados dos produtos do catálogo escolhidos como contexto delimitado', async () => {
    const provider = replyWith('Explicação.');
    const app = createTestApp(provider);
    const user = await registerUser(app);
    const product = await createCatalogProduct({ name: 'Creme Contexto', ingredients: ['Aqua', 'Urea'] });

    await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ message: 'Explique este produto', productIds: [product.id] })
      .expect(201);

    expect(provider.calls[0]?.system).toContain('Creme Contexto');
    expect(provider.calls[0]?.system).toContain('Aqua, Urea');
    expect(provider.calls[0]?.system).toContain('<dados tipo="produtos_selecionados">');
  });

  it('não salva conversa quando a IA falha e devolve erro claro', async () => {
    const failing = new FakeLlmProvider(async () => {
      throw new LlmProviderError('unavailable', 'falha simulada', 500);
    });
    const app = createTestApp(failing);
    const user = await registerUser(app);

    const response = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ message: 'Olá' })
      .expect(503);
    expect(response.body.error.code).toBe('AI_UNAVAILABLE');
    expect(await prisma.conversation.count()).toBe(0);
    expect(await prisma.aiUsageLog.count({ where: { success: false } })).toBe(1);
  });

  it('rejeita mensagens acima do limite configurado sem chamar o provedor', async () => {
    const provider = replyWith('ok');
    const app = createTestApp(provider);
    const user = await registerUser(app);
    const response = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ message: 'a'.repeat(501) })
      .expect(400);
    expect(response.body.error.message).toContain('500');
    expect(provider.calls).toHaveLength(0);
  });

  it('aplica a cota diária por usuário', async () => {
    const app = createTestApp(replyWith('ok'), { dailyLimitPerUser: 1 });
    const user = await registerUser(app);
    const auth = { Authorization: `Bearer ${user.token}` };
    await request(app).post('/api/conversations').set(auth).send({ message: 'Primeira' }).expect(201);
    const second = await request(app).post('/api/conversations').set(auth).send({ message: 'Segunda' }).expect(429);
    expect(second.body.error.code).toBe('AI_QUOTA_EXCEEDED');
  });

  it('separa a explicação da IA do conteúdo da base de referência', async () => {
    const app = createTestApp(replyWith('Texto gerado pela IA.'));
    const user = await registerUser(app);
    const auth = { Authorization: `Bearer ${user.token}` };
    await prisma.ingredient.create({
      data: {
        name: 'Glycerin',
        normalizedName: 'glycerin',
        searchTerms: ['glycerin', 'glicerina'],
        description: 'Descrição curada.',
        isCurated: true,
        sources: { create: { title: 'Fonte', publisher: 'Editora', url: 'https://exemplo.org' } },
      },
    });

    const lookup = await request(app)
      .post('/api/ingredient-analyses')
      .set(auth)
      .send({ query: 'glicerina' })
      .expect(201);
    expect(lookup.body.foundInCatalog).toBe(true);
    expect(lookup.body.ingredient.description).toBe('Descrição curada.');
    expect(lookup.body.aiExplanation).toBeNull();

    const explained = await request(app)
      .post(`/api/ingredient-analyses/${lookup.body.id}/explanation`)
      .set(auth)
      .expect(200);
    expect(explained.body.ingredient.description).toBe('Descrição curada.');
    expect(explained.body.ingredient.sources).toHaveLength(1);
    expect(explained.body.aiExplanation).toEqual({ text: 'Texto gerado pela IA.', model: 'fake-model' });
  });

  it('informa quando o ingrediente não tem informação confiável na base', async () => {
    const app = createTestApp(null);
    const user = await registerUser(app);
    const lookup = await request(app)
      .post('/api/ingredient-analyses')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ query: 'Ingrediente Inexistente XYZ' })
      .expect(201);
    expect(lookup.body.foundInCatalog).toBe(false);
    expect(lookup.body.ingredient).toBeNull();
  });
});
