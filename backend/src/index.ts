import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { AiService } from './modules/ai/ai.service.js';
import { createLlmProvider } from './modules/ai/provider-factory.js';

export const ai = new AiService(createLlmProvider(env), prisma, {
  timeoutMs: env.AI_TIMEOUT_MS,
  maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
  maxInputChars: env.AI_MAX_INPUT_CHARS,
  dailyLimitPerUser: env.AI_DAILY_LIMIT_PER_USER,
});

const app = createApp({ ai });

export default app;
