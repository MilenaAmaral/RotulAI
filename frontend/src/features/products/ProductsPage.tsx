import { Package, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { inputClass } from '../../components/ui/styles';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingBlock } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { CATEGORY_LABELS, CATEGORY_OPTIONS, formatDate, pluralize } from '../../lib/format';
import { useProducts } from '../../lib/queries';
import type { ProductCategory, ProductListItem } from '../../types/api';
import { ProductThumb } from './ProductThumb';

function ProductRow({ product }: { product: ProductListItem }) {
  return (
    <li>
      <Link
        to={`/produtos/${product.id}`}
        className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-mist/70 sm:px-5"
      >
        <ProductThumb name={product.name} imageUrl={product.imageUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{product.name}</span>
          <span className="block truncate text-sm text-ink-soft">{product.brand}</span>
        </span>
        <span className="hidden w-36 shrink-0 md:block">
          <Badge tone="outline">{CATEGORY_LABELS[product.category]}</Badge>
        </span>
        <span className="hidden w-32 shrink-0 text-sm text-ink-soft sm:block">
          {pluralize(product.ingredientCount, 'ingrediente', 'ingredientes')}
        </span>
        <time dateTime={product.createdAt} className="hidden w-28 shrink-0 text-right text-sm text-ink-soft lg:block">
          {formatDate(product.createdAt)}
        </time>
      </Link>
    </li>
  );
}

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = (params.get('categoria') ?? '') as ProductCategory | '';
  const page = Number(params.get('pagina') ?? '1') || 1;
  const [searchText, setSearchText] = useState(q);

  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  // Busca com atraso curto para não disparar uma requisição por tecla.
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

  const products = useProducts({ q: q || undefined, category, page, pageSize: 12 });
  const filtering = Boolean(q || category);

  return (
    <>
      <PageHeader
        title="Catálogo"
        description="Os cosméticos que você cadastrou, com a lista de ingredientes de cada rótulo."
        actions={
          <ButtonLink to="/produtos/novo" icon={<Plus size={18} aria-hidden="true" />}>
            Cadastrar produto
          </ButtonLink>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="busca-produtos" className="sr-only">
            Buscar por nome ou marca
          </label>
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone"
            aria-hidden="true"
          />
          <input
            id="busca-produtos"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por nome ou marca"
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="sm:w-56">
          <label htmlFor="filtro-categoria" className="sr-only">
            Filtrar por categoria
          </label>
          <select
            id="filtro-categoria"
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

      {products.data &&
        products.data.total === 0 &&
        (filtering ? (
          <EmptyState
            icon={<Search size={20} />}
            title="Nenhum produto encontrado"
            description="Nenhum produto corresponde à busca ou ao filtro. Ajuste os termos ou limpe os filtros."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  setParams(new URLSearchParams(), { replace: true });
                }}
                className="font-semibold underline decoration-sun decoration-2 underline-offset-4"
              >
                Limpar filtros
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<Package size={20} />}
            title="Nenhum produto cadastrado"
            description="Cadastre um cosmético com a lista de ingredientes do rótulo para começar a consultar e comparar."
            action={<ButtonLink to="/produtos/novo">Cadastrar produto</ButtonLink>}
          />
        ))}

      {products.data && products.data.total > 0 && (
        <>
          <p className="mb-2 text-sm text-ink-soft" aria-live="polite">
            {pluralize(products.data.total, 'produto', 'produtos')}
          </p>
          <ul className={`panel divide-y divide-line overflow-hidden ${products.isFetching ? 'opacity-70' : ''}`}>
            {products.data.items.map((product) => (
              <ProductRow key={product.id} product={product} />
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
