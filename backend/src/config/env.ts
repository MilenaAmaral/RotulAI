import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  // Origens permitidas para CORS, separadas por vírgula.
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  // Quantidade de proxies confiáveis à frente da API (ex.: 1 no Render/Railway).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(60).default(7),
  COOKIE_SECURE: booleanFromString.optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  AI_PROVIDER: z.enum(['anthropic', 'none']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-haiku-5-5'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(64).max(4096).default(1024),
  AI_MAX_INPUT_CHARS: z.coerce.number().int().min(100).max(8000).default(2000),
  AI_HISTORY_MESSAGES: z.coerce.number().int().min(2).max(40).default(12),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(120).default(10),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().min(1).max(5000).default(100),

  HISTORY_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(180),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n');
    console.error(`Configuração inválida. Verifique o arquivo .env:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
export const cookieSecure = env.COOKIE_SECURE ?? isProduction;
