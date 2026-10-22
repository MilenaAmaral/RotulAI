import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { scheduleRetentionJob } from './modules/history/retention.js';
import app, { ai } from './index.js';

const server = app.listen(env.PORT, () => {
  const status = ai.status();
  logger.info(
    { port: env.PORT, ai: status.enabled ? `${status.provider} (${status.model})` : 'desabilitada' },
    `Rotulai API em http://localhost:${env.PORT} | documentação em /api/docs`,
  );
  if (!status.enabled) logger.warn(status.setupInstructions);
});

const retentionTimer = scheduleRetentionJob();

function shutdown(signal: string) {
  logger.info({ signal }, 'Encerrando servidor');
  clearInterval(retentionTimer);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
