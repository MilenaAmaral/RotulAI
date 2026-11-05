import type { Session } from '../types/api';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/*
 * O access token fica apenas em memória; um sinal sem credenciais evita refresh para visitantes anônimos.
 */
let accessToken: string | null = null;
let refreshInFlight: Promise<Session | null> | null = null;
let sessionExpiredHandler: (() => void) | null = null;
const SESSION_HINT_KEY = 'rotulai-session-hint';

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionHint(available: boolean): void {
  try {
    if (available) localStorage.setItem(SESSION_HINT_KEY, 'true');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'SecurityError')) throw error;
  }
}

function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === 'true';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'SecurityError') return false;
    throw error;
  }
}

export function onSessionExpired(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } };
    return new ApiError(
      response.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? 'Não foi possível concluir a operação.',
      body.error?.details ?? [],
    );
  } catch {
    return new ApiError(response.status, 'UNKNOWN', 'Não foi possível concluir a operação.');
  }
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, { ...init, credentials: 'include' });
  } catch {
    throw new ApiError(
      0,
      'NETWORK',
      'Não foi possível conectar ao servidor. Verifique sua conexão e se a API está em execução.',
    );
  }
}

/** Renova a sessão. Chamadas simultâneas compartilham a mesma requisição (evita reuso do token rotacionado). */
export function refreshSession(): Promise<Session | null> {
  if (!accessToken && !hasSessionHint()) return Promise.resolve(null);
  refreshInFlight ??= (async () => {
    try {
      const response = await rawFetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'X-Requested-With': 'RotulAI' },
      });
      if (!response.ok) {
        setAccessToken(null);
        setSessionHint(false);
        return null;
      }
      const session = (await response.json()) as Session;
      setAccessToken(session.accessToken);
      setSessionHint(true);
      return session;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = options;
  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  if (auth && accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;

  const response = await rawFetch(path, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && !retried) {
    const session = await refreshSession();
    if (session) return api<T>(path, options, true);
    sessionExpiredHandler?.();
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function toQueryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Algo deu errado. Tente novamente.';
}
