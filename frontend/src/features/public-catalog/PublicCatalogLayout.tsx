import { Link, NavLink, Outlet } from 'react-router';
import { Logo } from '../../components/ui/Logo';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-brand-soft text-graphite' : 'text-ink-soft hover:bg-mist hover:text-graphite'
  }`;

export function PublicCatalogLayout() {
  return (
    <div className="min-h-dvh bg-mist/40">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link to="/catalogo" aria-label="Rotulai — catálogo público">
            <Logo />
          </Link>
          <nav aria-label="Catálogo público" className="flex flex-wrap items-center gap-1">
            <NavLink to="/catalogo" end className={linkClass}>
              Produtos
            </NavLink>
            <NavLink to="/catalogo/ingredientes" className={linkClass}>
              Ingredientes
            </NavLink>
            <Link
              to="/entrar"
              className="ml-1 rounded-[var(--radius-control)] bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand/90"
            >
              Acessar minha conta
            </Link>
          </nav>
        </div>
      </header>
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto max-w-[1120px] px-4 py-7 focus:outline-none sm:px-8 sm:py-10"
      >
        <Outlet />
        <footer className="mt-10 border-t border-line py-5 text-sm text-ink-soft">
          Conteúdo educacional: não substitui orientação dermatológica e não indica tratamentos.
        </footer>
      </main>
    </div>
  );
}
