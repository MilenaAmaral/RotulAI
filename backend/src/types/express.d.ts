import type { AccessProfile } from '../generated/prisma/enums.js';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware requireAuth após validar o access token. */
      auth?: { userId: string; role: AccessProfile };
    }
  }
}

export {};
