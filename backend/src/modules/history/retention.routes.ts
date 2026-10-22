import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { purgeExpiredHistory } from './retention.js';

type RetentionJob = typeof purgeExpiredHistory;

function hasValidSecret(authorization: string | undefined, secret: string): boolean {
  if (!authorization?.startsWith('Bearer ')) return false;
  const provided = Buffer.from(authorization.slice('Bearer '.length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function retentionRouter(runRetention: RetentionJob = purgeExpiredHistory, secret = env.CRON_SECRET): Router {
  const router = Router();

  router.get('/retention', async (req, res) => {
    if (!secret) {
      res.status(503).json({ error: 'Rotina agendada não configurada.' });
      return;
    }
    if (!hasValidSecret(req.get('authorization'), secret)) {
      res.status(401).json({ error: 'Não autorizado.' });
      return;
    }

    res.json({ status: 'ok', removed: await runRetention() });
  });

  return router;
}
