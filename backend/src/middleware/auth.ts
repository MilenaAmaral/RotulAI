import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../lib/errors.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';

/** Exige um access token válido no cabeçalho Authorization: Bearer <token>. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized();
  }
  const payload = verifyAccessToken(header.slice('Bearer '.length).trim());
  if (!payload) {
    throw unauthorized('Sessão expirada ou inválida. Entre novamente.');
  }
  req.auth = { userId: payload.sub };
  next();
}

/** Retorna o id do usuário autenticado. Só deve ser usado em rotas protegidas por requireAuth. */
export function getUserId(req: Request): string {
  if (!req.auth) {
    throw unauthorized();
  }
  return req.auth.userId;
}

/**
 * Exige um cabeçalho customizado em rotas que dependem apenas do cookie (refresh/logout).
 * Navegadores não enviam cabeçalhos customizados entre origens sem preflight CORS,
 * o que bloqueia requisições forjadas (CSRF) vindas de outros sites.
 */
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction): void {
  if (req.get('X-Requested-With') !== 'Rotulai') {
    throw unauthorized('Requisição sem cabeçalho de proteção obrigatório.');
  }
  next();
}
