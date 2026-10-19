import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AccessProfile } from '../../src/generated/prisma/enums.js';
import { AppError } from '../../src/lib/errors.js';
import { requireRole } from '../../src/middleware/auth.js';

function requestWithRole(role?: AccessProfile): Request {
  return {
    auth: role ? { userId: 'test-user', role } : undefined,
  } as Request;
}

describe('autorização por perfil', () => {
  it('permite o perfil exigido', () => {
    const next = vi.fn<NextFunction>();
    requireRole(AccessProfile.ADMIN)(requestWithRole(AccessProfile.ADMIN), {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('retorna 403 para um perfil autenticado sem permissão', () => {
    const next = vi.fn<NextFunction>();
    try {
      requireRole(AccessProfile.ADMIN)(requestWithRole(AccessProfile.FREE), {} as Response, next);
      throw new Error('A autorização deveria ter sido negada.');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(403);
    }
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 401 quando não há perfil autenticado', () => {
    const next = vi.fn<NextFunction>();
    try {
      requireRole(AccessProfile.ADMIN)(requestWithRole(), {} as Response, next);
      throw new Error('A autorização deveria exigir autenticação.');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(401);
    }
    expect(next).not.toHaveBeenCalled();
  });
});
