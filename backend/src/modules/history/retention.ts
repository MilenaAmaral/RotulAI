import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { purgeStaleRefreshTokens } from '../auth/auth.service.js';

export const AI_USAGE_RETENTION_DAYS = 30;

/**
 * Política de retenção:
 * - Consultas de ingredientes e comparações: removidas após HISTORY_RETENTION_DAYS da criação.
 * - Conversas: removidas após HISTORY_RETENTION_DAYS sem novas mensagens.
 * - Registros de uso da IA: removidos após 30 dias.
 * - Produtos cadastrados não expiram; são removidos pelo usuário ou com a exclusão da conta.
 */
export async function purgeExpiredHistory(retentionDays: number = env.HISTORY_RETENTION_DAYS, now = new Date()) {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const usageCutoff = new Date(now.getTime() - AI_USAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const [analyses, comparisons, conversations, aiUsage] = await prisma.$transaction([
    prisma.ingredientAnalysis.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.productComparison.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.conversation.deleteMany({ where: { updatedAt: { lt: cutoff } } }),
    prisma.aiUsageLog.deleteMany({ where: { createdAt: { lt: usageCutoff } } }),
  ]);
  const refreshTokens = await purgeStaleRefreshTokens();
  return {
    analyses: analyses.count,
    comparisons: comparisons.count,
    conversations: conversations.count,
    aiUsage: aiUsage.count,
    refreshTokens,
  };
}

/** Executa a limpeza na inicialização e a cada 24 horas em servidores persistentes. */
export function scheduleRetentionJob(): NodeJS.Timeout {
  const run = async () => {
    try {
      const removed = await purgeExpiredHistory();
      logger.info({ removed }, 'Rotina de retenção executada');
    } catch (error) {
      logger.error({ err: error instanceof Error ? error.message : 'desconhecido' }, 'Falha na rotina de retenção');
    }
  };
  void run();
  const timer = setInterval(run, 24 * 60 * 60 * 1000);
  timer.unref();
  return timer;
}
