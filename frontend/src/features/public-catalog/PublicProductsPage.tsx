import { Package, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { inputClass } from '../../components/ui/styles';
import { LoadingBlock } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { CATEGORY_LABELS, CATEGORY_OPTIONS, pluralize } from '../../lib/format';
import { usePublicProducts } from '../../lib/queries';
import type { ProductCategory } from '../../types/api';
import { SeoMeta } from './SeoMeta';

function isCategory(value: string): value is ProductCategory {
  return Object.hasOwn(CATEGORY_LABELS, value);
}

export function PublicProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const selectedCategory = params.get('categoria') ?? '';
  const category = isCategory(selectedCategory) ? selectedCategory : '';
  const page = Number(params.get('pagina') ?? '1') || 1;
  const [searchText, setSearchText] = useState(q);

  useEffect(() => {
    if (searchText.trim() === q) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchText.trim()) next.set('q', searchText.trim());
      else next.delete('q');
      next.delete('pagina');
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, q, params, setParams]);

  const products = usePublicProducts({ q: q || undefined, category, page, pageSize: 12 });
  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  return (
    <>
      <SeoMeta
        title="Catálogo público de cosméticos | Rotulai"
        description="Pesquise produtos e confira listas de ingredientes com referências. Informação educacional, sem diagnóstico ou indicação de tratamento."
        canonicalPath="/catalogo"
      />
      <PageHeader
        title="Catálogo público"
        description="Pesquise produtos e confira suas listas de ingredientes e fontes de referência."
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="busca-catalogo-publico" className="sr-only">
            Buscar produto por nome ou marca
          </label>
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone"
            aria-hidden="true"
          />
          <input
            id="busca-catalogo-publico"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por nome ou marca"
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="sm:w-56">
          <label htmlFor="categoria-catalogo-publico" className="sr-only">
            Filtrar produtos por categoria
          </label>
          <select
            id="categoria-catalogo-publico"
            value={category}
            onChange={(event) => updateParams({ categoria: event.target.value, pagina: '' })}
            className={inputClass}
          >
            <option value="">Todas as categorias</option>
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {products.isLoading && <LoadingBlock label="Carregando produtos..." />}
      {products.isError && <ErrorState error={products.error} onRetry={() => void products.refetch()} />}
      {products.data?.suggestions.length ? (
        <section aria-labelledby="sugestoes-busca" className="mb-5 rounded-[var(--radius-panel)] bg-brand-soft p-4">
          <h2 id="sugestoes-busca" className="font-semibold">
            Você quis dizer...
          </h2>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {products.data.suggestions.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/catalogo/produtos/${item.slug}`}
                  className="font-medium underline decoration-brand-accent decoration-2 underline-offset-4"
                >
                  {item.brand} — {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {products.data?.total === 0 && !products.data.suggestions.length && (
        <EmptyState
          icon={<Package size={20} />}
          title="Nenhum produto encontrado"
          description="Ajuste a busca ou a categoria para encontrar outros produtos."
        />
      )}
      {products.data && products.data.total > 0 && (
        <>
          <p className="mb-3 text-sm text-ink-soft" aria-live="polite">
            {pluralize(products.data.total, 'produto', 'produtos')}
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.items.map((product) => (
              <li key={product.id}>
                <Link
                  to={`/catalogo/produtos/${product.slug}`}
                  className="panel block h-full p-5 transition-colors hover:border-brand-accent"
                >
                  <span className="text-sm text-ink-soft">{product.brand}</span>
                  <span className="mt-1 block font-semibold">{product.name}</span>
                  <span className="mt-3 block text-sm text-ink-soft">
                    {CATEGORY_LABELS[product.category]} ·{' '}
                    {pluralize(product.ingredientCount, 'ingrediente', 'ingredientes')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={products.data.page}
            totalPages={products.data.totalPages}
            onChange={(next) => updateParams({ pagina: String(next) })}
          />
        </>
      )}
    </>
  );
}
