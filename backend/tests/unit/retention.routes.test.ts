import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { retentionRouter } from '../../src/modules/history/retention.routes.js';
import type { purgeExpiredHistory } from '../../src/modules/history/retention.js';

function createTestApp(
  secret: string | undefined,
  runRetention: typeof purgeExpiredHistory = vi.fn(async () => ({
    analyses: 0,
    comparisons: 0,
    conversations: 0,
    aiUsage: 0,
    refreshTokens: 0,
  })),
) {
  const app = express();
  app.use('/api/cron', retentionRouter(runRetention, secret));
  return { app, runRetention };
}

describe('retentionRouter', () => {
  it('recusa a execução quando o segredo não está configurado', async () => {
    const { app, runRetention } = createTestApp('');
    const response = await request(app).get('/api/cron/retention').expect(503);

    expect(response.body).toEqual({ error: 'Rotina agendada não configurada.' });
    expect(runRetention).not.toHaveBeenCalled();
  });

  it('recusa chamadas sem o segredo correto', async () => {
    const { app, runRetention } = createTestApp('a'.repeat(32));

    await request(app).get('/api/cron/retention').expect(401);
    await request(app)
      .get('/api/cron/retention')
      .set('Authorization', `Bearer ${'b'.repeat(32)}`)
      .expect(401);
    expect(runRetention).not.toHaveBeenCalled();
  });

  it('executa a limpeza apenas com o segredo Bearer válido', async () => {
    const runRetention = vi.fn().mockResolvedValue({
      analyses: 1,
      comparisons: 0,
      conversations: 2,
      aiUsage: 0,
      refreshTokens: 3,
    });
    const secret = 'a'.repeat(32);
    const { app } = createTestApp(secret, runRetention);

    const response = await request(app).get('/api/cron/retention').set('Authorization', `Bearer ${secret}`).expect(200);

    expect(runRetention).toHaveBeenCalledOnce();
    expect(response.body).toEqual({
      status: 'ok',
      removed: { analyses: 1, comparisons: 0, conversations: 2, aiUsage: 0, refreshTokens: 3 },
    });
  });
});
