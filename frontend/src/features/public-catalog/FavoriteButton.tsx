import { Heart } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/ui/Button';
import { useFavoriteStatus, useSetFavorite } from '../../lib/queries';

export function FavoriteButton({ productId }: { productId: string }) {
  const { status } = useAuth();
  const authenticated = status === 'authenticated';
  const favorite = useFavoriteStatus(productId, authenticated);
  const setFavorite = useSetFavorite(productId);

  if (!authenticated) {
    return (
      <Link
        to="/cadastro"
        onClick={(event) => event.stopPropagation()}
        className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-line px-3 text-sm font-semibold text-graphite hover:bg-mist"
        aria-label="Cadastre-se para salvar nos favoritos"
      >
        <Heart size={16} aria-hidden="true" />
        Favoritar
      </Link>
    );
  }

  const isFavorite = favorite.data?.isFavorite ?? false;
  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant={isFavorite ? 'secondary' : 'ghost'}
        icon={<Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />}
        loading={setFavorite.isPending}
        disabled={favorite.isLoading || favorite.isError}
        aria-pressed={isFavorite}
        onClick={(event) => {
          event.stopPropagation();
          setFavorite.mutate(isFavorite);
        }}
      >
        {isFavorite ? 'Salvo' : 'Favoritar'}
      </Button>
      {setFavorite.isError && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {setFavorite.error.message}
        </p>
      )}
    </div>
  );
}
