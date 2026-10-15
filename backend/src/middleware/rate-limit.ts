import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const rateLimitMessage = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });

export function createApiLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: rateLimitMessage('Muitas requisições. Aguarde alguns minutos e tente novamente.'),
  });
}

export function createAuthLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 1000 : 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: rateLimitMessage('Muitas tentativas de autenticação. Aguarde 15 minutos.'),
  });
}

/** Renovação de sessão ocorre a cada carregamento de página; limite mais amplo que o de login. */
export function createRefreshLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: rateLimitMessage('Muitas renovações de sessão. Aguarde alguns minutos.'),
  });
}

/** Limite por usuário autenticado (com fallback para IP) nas rotas que chamam a IA. */
export function createAiLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: env.AI_RATE_LIMIT_PER_MINUTE,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.auth?.userId ?? ipKeyGenerator(req.ip ?? 'desconhecido'),
    message: rateLimitMessage('Limite de solicitações à IA atingido. Aguarde um minuto.'),
  });
}
