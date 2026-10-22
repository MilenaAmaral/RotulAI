import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '../components/ui/Spinner';
import { useAuth } from './auth-context';
import type { User } from '../types/api';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'anonymous') {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  return <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function RequireRole({ role }: { role: User['role'] }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'anonymous') return <Navigate to="/entrar" replace />;
  if (user?.role !== role) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
