declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware requireAuth após validar o access token. */
      auth?: { userId: string };
    }
  }
}

export {};
