import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { AppError, unauthorized } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from './tokens.js';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const publicUserSelect = { id: true, name: true, email: true, createdAt: true } as const;

// Hash fixo usado quando o e-mail não existe, para que o tempo de resposta
// não revele se a conta está cadastrada.
const DUMMY_HASH = bcrypt.hashSync('skinai-dummy-password-1', 10);

async function createSession(user: PublicUser, familyId: string = randomUUID()): Promise<AuthSession> {
  const { token, tokenHash } = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, familyId, expiresAt: refreshExpiresAt },
  });
  return { user, accessToken: signAccessToken(user.id), refreshToken: token, refreshExpiresAt };
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Já existe uma conta com este e-mail.');
  }
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
    select: publicUserSelect,
  });
  return createSession(user);
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordMatches) {
    throw unauthorized('E-mail ou senha incorretos.');
  }
  return createSession({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
}

/**
 * Rotação de refresh token: cada token só pode ser usado uma vez.
 * Se um token já revogado for reapresentado, toda a família é revogada
 * (indício de que o token foi copiado por terceiros).
 */
export async function refresh(rawToken: string | undefined): Promise<AuthSession> {
  if (!rawToken) {
    throw unauthorized('Sessão não encontrada. Entre novamente.');
  }
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(rawToken) } });
  if (!stored) {
    throw unauthorized('Sessão inválida. Entre novamente.');
  }
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('Sessão inválida. Entre novamente.');
  }
  if (stored.expiresAt <= new Date()) {
    throw unauthorized('Sessão expirada. Entre novamente.');
  }

  const revoked = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count === 0) {
    throw unauthorized('Sessão inválida. Entre novamente.');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId }, select: publicUserSelect });
  if (!user) {
    throw unauthorized('Sessão inválida. Entre novamente.');
  }
  return createSession(user, stored.familyId);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashRefreshToken(rawToken) } });
  if (!stored) return;
  await prisma.refreshToken.updateMany({
    where: { familyId: stored.familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw unauthorized('Conta não encontrada.');
  }
  return user;
}

/** Exclui a conta e, em cascata, todos os dados privados do usuário. */
export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(403, 'FORBIDDEN', 'Senha incorreta.');
  }
  await prisma.user.delete({ where: { id: userId } });
}

/** Remove refresh tokens expirados ou revogados há mais de um dia. */
export async function purgeStaleRefreshTokens(): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: oneDayAgo } }] },
  });
  return result.count;
}
