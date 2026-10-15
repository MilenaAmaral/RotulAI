import type { CookieOptions, Response } from 'express';
import { Router } from 'express';
import { cookieSecure, env } from '../../config/env.js';
import { getUserId, requireAuth, requireCsrfHeader } from '../../middleware/auth.js';
import { createAuthLimiter, createRefreshLimiter } from '../../middleware/rate-limit.js';
import { parseInput } from '../../middleware/validate.js';
import { deleteAccountSchema, loginSchema, registerSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export const REFRESH_COOKIE = 'skinai_rt';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/auth',
};

function sendSession(res: Response, session: authService.AuthSession, status = 200): void {
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...baseCookieOptions, expires: session.refreshExpiresAt });
  res.status(status).json({ user: session.user, accessToken: session.accessToken });
}

function readRefreshCookie(cookies: unknown): string | undefined {
  if (typeof cookies !== 'object' || cookies === null) return undefined;
  const value = (cookies as Record<string, unknown>)[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

export function authRouter(): Router {
  const router = Router();
  const authLimiter = createAuthLimiter();
  const refreshLimiter = createRefreshLimiter();

  router.post('/register', authLimiter, async (req, res) => {
    const input = parseInput(registerSchema, req.body);
    sendSession(res, await authService.register(input), 201);
  });

  router.post('/login', authLimiter, async (req, res) => {
    const input = parseInput(loginSchema, req.body);
    sendSession(res, await authService.login(input));
  });

  router.post('/refresh', refreshLimiter, requireCsrfHeader, async (req, res) => {
    try {
      sendSession(res, await authService.refresh(readRefreshCookie(req.cookies)));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, baseCookieOptions);
      throw error;
    }
  });

  router.post('/logout', requireCsrfHeader, async (req, res) => {
    await authService.logout(readRefreshCookie(req.cookies));
    res.clearCookie(REFRESH_COOKIE, baseCookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    res.json({ user: await authService.getCurrentUser(getUserId(req)) });
  });

  router.delete('/me', requireAuth, authLimiter, async (req, res) => {
    const { password } = parseInput(deleteAccountSchema, req.body);
    await authService.deleteAccount(getUserId(req), password);
    res.clearCookie(REFRESH_COOKIE, baseCookieOptions);
    res.status(204).end();
  });

  return router;
}
