import {
  ArrowLeftRight,
  BookOpen,
  FlaskConical,
  Heart,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { cn } from '../ui/cn';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

const navItems = [
  { to: '/dashboard', label: 'Início', icon: LayoutGrid, end: true },
  { to: '/catalogo', label: 'Catálogo público', icon: BookOpen },
  { to: '/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/catalogo/ingredientes', label: 'Ingredientes', icon: FlaskConical },
  { to: '/comparar', label: 'Comparador', icon: ArrowLeftRight },
  { to: '/assistente', label: 'Assistente', icon: MessageCircle },
  { to: '/historico', label: 'Histórico', icon: History },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items =
    user?.role === 'ADMIN' ? [...navItems, { to: '/admin', label: 'Administração', icon: ShieldCheck }] : navItems;
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-[15px] font-medium transition-colors',
                isActive
                  ? 'bg-brand-soft text-graphite before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-accent'
                  : 'text-ink-soft hover:bg-mist hover:text-graphite',
              )
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function AccountBlock({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <div className="border-t border-line pt-4">
      <Link
        to="/conta"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 hover:bg-mist"
      >
        <span
          className="flex size-8 items-center justify-center rounded-full bg-graphite text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {user?.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{user?.name}</span>
          <span className="block truncate text-xs text-ink-soft">Minha conta</span>
        </span>
        <UserRound size={16} className="ml-auto text-stone" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-1 flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-ink-soft hover:bg-mist hover:text-graphite"
      >
        <LogOut size={16} aria-hidden="true" />
        Sair
      </button>
    </div>
  );
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>

      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col self-start border-r border-line bg-white px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center justify-between px-3">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <nav aria-label="Principal" className="flex-1">
          <Navigation />
        </nav>
        <AccountBlock />
      </aside>

      {/* Barra superior (tablet e celular) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-movel"
            className="flex size-10 items-center justify-center rounded-[var(--radius-control)] text-graphite hover:bg-mist"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
          </button>
        </div>
      </header>
      {menuOpen && (
        <div
          id="menu-movel"
          className="fixed inset-x-0 top-14 bottom-0 z-20 flex flex-col overflow-y-auto bg-white px-4 py-4 lg:hidden"
        >
          <nav aria-label="Principal" className="flex-1">
            <Navigation onNavigate={() => setMenuOpen(false)} />
          </nav>
          <AccountBlock onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <main id="conteudo" tabIndex={-1} className="min-w-0 px-4 py-7 focus:outline-none sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-[1080px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
