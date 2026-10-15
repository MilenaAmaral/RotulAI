import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { AiService } from './modules/ai/ai.service.js';
import { createLlmProvider } from './modules/ai/provider-factory.js';
import { scheduleRetentionJob } from './modules/history/retention.js';

const ai = new AiService(createLlmProvider(env), prisma, {
  timeoutMs: env.AI_TIMEOUT_MS,
  maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
  maxInputChars: env.AI_MAX_INPUT_CHARS,
  dailyLimitPerUser: env.AI_DAILY_LIMIT_PER_USER,
});

const app = createApp({ ai });
const server = app.listen(env.PORT, () => {
  const status = ai.status();
  logger.info(
    { port: env.PORT, ai: status.enabled ? `${status.provider} (${status.model})` : 'desabilitada' },
    `SkinAI API em http://localhost:${env.PORT} | documentação em /api/docs`,
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
