import { Heart, Package } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingBlock } from '../../components/ui/Spinner';
import { CATEGORY_LABELS, pluralize } from '../../lib/format';
import { useFavorites, useSetFavorite } from '../../lib/queries';

export function FavoritesPage() {
  const [page, setPage] = useState(1);
  const favorites = useFavorites(page);

  return (
    <>
      <PageHeader
        title="Meus favoritos"
        description="Produtos do catálogo público que você salvou para consultar depois."
      />
      {favorites.isLoading && <LoadingBlock label="Carregando favoritos..." />}
      {favorites.isError && <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} />}
      {favorites.data?.total === 0 && (
        <EmptyState
          icon={<Heart size={20} />}
          title="Você ainda não salvou produtos"
          description="Explore o catálogo público e use o botão Favoritar nos produtos que deseja acompanhar."
          action={
            <Link to="/catalogo" className="font-semibold underline decoration-brand-accent underline-offset-4">
              Explorar catálogo
            </Link>
          }
        />
      )}
      {favorites.data && favorites.data.total > 0 && (
        <>
          <p className="mb-3 text-sm text-ink-soft" aria-live="polite">
            {pluralize(favorites.data.total, 'favorito', 'favoritos')}
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.data.items.map((product) => (
              <li key={product.id} className="panel flex flex-col p-5">
                <Link to={`/catalogo/produtos/${product.slug}`} className="flex-1">
                  <span className="text-sm text-ink-soft">{product.brand}</span>
                  <span className="mt-1 block font-semibold">{product.name}</span>
                  <span className="mt-3 block text-sm text-ink-soft">
                    {CATEGORY_LABELS[product.category]} ·{' '}
                    {pluralize(product.ingredientCount, 'ingrediente', 'ingredientes')}
                  </span>
                </Link>
                <div className="mt-3 flex justify-end">
                  <RemoveFavoriteButton productId={product.id} />
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={favorites.data.page} totalPages={favorites.data.totalPages} onChange={setPage} />
        </>
      )}
      {!favorites.isLoading && !favorites.isError && !favorites.data && (
        <EmptyState
          icon={<Package size={20} />}
          title="Favoritos indisponíveis"
          description="Não foi possível carregar os seus produtos favoritos."
        />
      )}
    </>
  );
}

function RemoveFavoriteButton({ productId }: { productId: string }) {
  const remove = useSetFavorite(productId);
  return (
    <div>
      <Button
        size="sm"
        variant="secondary"
        icon={<Heart size={16} fill="currentColor" aria-hidden="true" />}
        loading={remove.isPending}
        onClick={() => remove.mutate(true)}
      >
        Remover
      </Button>
      {remove.isError && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {remove.error.message}
        </p>
      )}
    </div>
  );
}
