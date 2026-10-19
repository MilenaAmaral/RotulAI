import type { NextFunction, Request, Response } from 'express';
import type { AccessProfile } from '../generated/prisma/enums.js';
import { AppError, unauthorized } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';

/** Exige um access token válido no cabeçalho Authorization: Bearer <token>. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized();
  }
  const payload = verifyAccessToken(header.slice('Bearer '.length).trim());
  if (!payload) {
    throw unauthorized('Sessão expirada ou inválida. Entre novamente.');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { role: true } });
  if (!user) {
    throw unauthorized('Sessão expirada ou inválida. Entre novamente.');
  }
  req.auth = { userId: payload.sub, role: user.role };
  next();
}

/** Retorna o id do usuário autenticado. Só deve ser usado em rotas protegidas por requireAuth. */
export function getUserId(req: Request): string {
  if (!req.auth) {
    throw unauthorized();
  }
  return req.auth.userId;
}

export function requireRole(...allowedRoles: AccessProfile[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw unauthorized();
    }
    if (!allowedRoles.includes(req.auth.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Seu perfil não tem permissão para esta ação.');
    }
    next();
  };
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
