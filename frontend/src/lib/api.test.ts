import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshSession, setAccessToken, setSessionHint } from './api';

describe('restauração da sessão', () => {
  beforeEach(() => {
    localStorage.clear();
    setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('não chama refresh para visitantes sem indício de sessão', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(refreshSession()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tenta refresh quando há um indício e remove a flag após uma sessão expirada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    setSessionHint(true);

    await expect(refreshSession()).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('rotulai-session-hint')).toBeNull();
  });
});
