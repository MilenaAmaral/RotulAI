import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, onSessionExpired, refreshSession, setAccessToken } from '../lib/api';
import type { Session, User } from '../types/api';
import type { AuthStatus } from './auth-context';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const applySession = useCallback((session: Session) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    void refreshSession().then((session) => {
      if (!active) return;
      if (session) applySession(session);
      else setStatus('anonymous');
    });
    onSessionExpired(clearSession);
    return () => {
      active = false;
      onSessionExpired(null);
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      applySession(await api<Session>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }));
    },
    [applySession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      applySession(
        await api<Session>('/api/auth/register', { method: 'POST', body: { name, email, password }, auth: false }),
      );
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api<void>('/api/auth/logout', { method: 'POST', auth: false, headers: { 'X-Requested-With': 'Rotulai' } });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, login, register, logout, clearSession }),
    [status, user, login, register, logout, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
