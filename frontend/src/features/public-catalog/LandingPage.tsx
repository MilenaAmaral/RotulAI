import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorState } from '../../components/ui/States';
import { LoadingBlock } from '../../components/ui/Spinner';
import { CATEGORY_LABELS, pluralize } from '../../lib/format';
import { usePublicProducts } from '../../lib/queries';
import { inputClass } from '../../components/ui/styles';
import { SeoMeta } from './SeoMeta';

export function LandingPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const products = usePublicProducts({ page: 1, pageSize: 3 });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/catalogo?q=${encodeURIComponent(query)}` : '/catalogo');
  };

  return (
    <>
      <SeoMeta
        title="RotulAI | Entenda os produtos que você consome"
        description="Explore informações públicas sobre produtos cosméticos, ingredientes e fontes de referência."
        canonicalPath="/"
      />

      <section className="grid gap-8 py-10 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12 lg:py-20">
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-brand">
            Informação de rótulos, com clareza
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl lg:text-[3.5rem]">
            Entenda o que existe nos produtos que você consome.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            Explore informações sobre ingredientes e composição de cosméticos em uma experiência de consulta simples e
            acessível.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#catalogo"
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-brand px-5 py-2.5 font-semibold text-white transition-colors hover:bg-brand-deep"
            >
              Explorar catálogo <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link
              to="/cadastro"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-line bg-white px-5 py-2.5 font-semibold text-graphite transition-colors hover:bg-mist"
            >
              Criar minha conta
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-panel)] bg-brand-soft">
          <img
            src="/capa_rotuloai.jpg"
            alt="Três pessoas cuidando da pele em um ambiente claro e acolhedor"
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/10] lg:aspect-[4/3]"
            fetchPriority="high"
          />
        </div>
      </section>

      <section id="catalogo" aria-labelledby="catalogo-titulo" className="scroll-mt-6 py-10 sm:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Consulta pública</p>
            <h2 id="catalogo-titulo" className="mt-2 text-3xl font-bold">
              Explore o catálogo
            </h2>
            <p className="mt-2 max-w-2xl text-ink-soft">
              Consulte produtos e suas listas de referência. As fórmulas podem mudar; confira sempre a embalagem.
            </p>
          </div>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 font-semibold text-brand hover:bg-brand-soft"
          >
            Ver catálogo completo <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        <form onSubmit={submitSearch} role="search" className="mb-6 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="busca-inicial" className="sr-only">
            Buscar produto por nome ou marca
          </label>
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone"
              aria-hidden="true"
            />
            <input
              id="busca-inicial"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou marca"
              className={`${inputClass} pl-10`}
            />
          </div>
          <button
            type="submit"
            className="min-h-11 rounded-[var(--radius-control)] bg-brand px-5 py-2.5 font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Buscar produtos
          </button>
        </form>

        {products.isPending && <LoadingBlock label="Carregando produtos do catálogo..." />}
        {products.isError && <ErrorState error={products.error} onRetry={() => void products.refetch()} />}
        {products.data?.total === 0 && (
          <div className="rounded-[var(--radius-panel)] border border-dashed border-line bg-white px-6 py-10 text-center">
            <BookOpen size={26} className="mx-auto text-brand" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Nosso catálogo está em desenvolvimento</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Novos produtos serão adicionados conforme dados confiáveis forem disponíveis.
            </p>
          </div>
        )}
        {products.data && products.data.items.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.items.map((product) => (
              <li key={product.id}>
                <article className="panel flex h-full flex-col p-5 transition-colors hover:border-brand-accent">
                  <p className="text-sm font-medium text-ink-soft">{product.brand}</p>
                  <h3 className="mt-1 text-lg font-semibold">{product.name}</h3>
                  <p className="mt-3 text-sm text-ink-soft">
                    {CATEGORY_LABELS[product.category]} ·{' '}
                    {pluralize(product.ingredientCount, 'ingrediente', 'ingredientes')}
                  </p>
                  <Link
                    to={`/catalogo/produtos/${product.slug}`}
                    className="mt-5 inline-flex items-center gap-2 font-semibold text-brand underline decoration-brand-accent decoration-2 underline-offset-4"
                  >
                    Ver informações públicas <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="como-funciona" className="border-t border-line py-10 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Simples e transparente</p>
        <h2 id="como-funciona" className="mt-2 text-3xl font-bold">
          Como funciona
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Explore o catálogo', 'Encontre produtos por nome, marca ou categoria.'],
            ['02', 'Consulte as informações', 'Veja os ingredientes e as fontes disponíveis para cada produto.'],
            [
              '03',
              'Acesse recursos pessoais',
              'Com uma conta, salve favoritos e use os recursos disponíveis na plataforma.',
            ],
          ].map(([number, title, description]) => (
            <li key={number} className="panel p-5">
              <span className="text-sm font-bold text-brand">{number}</span>
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-8 rounded-[var(--radius-panel)] bg-brand px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Conheça melhor os produtos da sua rotina.</h2>
            <p className="mt-2 max-w-2xl text-white/85">
              Crie uma conta para salvar favoritos e acessar os recursos disponíveis na plataforma.
            </p>
          </div>
          <Link
            to="/cadastro"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-white px-5 py-2.5 font-semibold text-brand transition-colors hover:bg-brand-soft"
          >
            Criar minha conta <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
