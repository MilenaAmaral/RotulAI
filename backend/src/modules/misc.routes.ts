import { Router } from 'express';
import { env } from '../config/env.js';
import { getUserId } from '../middleware/auth.js';
import type { AiService } from './ai/ai.service.js';
import { getDashboard } from './dashboard/dashboard.service.js';
import { AI_USAGE_RETENTION_DAYS } from './history/retention.js';

export function miscRouter(ai: AiService): Router {
  const router = Router();

  router.get('/dashboard', async (req, res) => {
    res.json(await getDashboard(getUserId(req)));
  });

  router.get('/ai/status', (_req, res) => {
    res.json(ai.status());
  });

  router.get('/history/policy', (_req, res) => {
    res.json({
      historyRetentionDays: env.HISTORY_RETENTION_DAYS,
      aiUsageRetentionDays: AI_USAGE_RETENTION_DAYS,
      aiDailyLimitPerUser: env.AI_DAILY_LIMIT_PER_USER,
      rules: [
        `Consultas de ingredientes e comparações são excluídas automaticamente ${env.HISTORY_RETENTION_DAYS} dias após a criação.`,
        `Conversas sem novas mensagens por ${env.HISTORY_RETENTION_DAYS} dias são excluídas automaticamente.`,
        'Você pode excluir qualquer registro individualmente ou limpar cada histórico a qualquer momento.',
        'Produtos cadastrados não expiram e só são removidos por você.',
        `Registros técnicos de uso da IA (sem conteúdo das mensagens) são mantidos por ${AI_USAGE_RETENTION_DAYS} dias para controle de limite.`,
        'Ao excluir a conta, todos os seus dados são removidos permanentemente.',
      ],
    });
  });

  return router;
}
