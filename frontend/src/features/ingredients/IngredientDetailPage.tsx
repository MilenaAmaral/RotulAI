import { Sparkles } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/Spinner';
import { EducationalDisclaimer, ErrorState } from '../../components/ui/States';
import { useIngredient, useLookupIngredient } from '../../lib/queries';
import { IngredientReference } from './IngredientReference';

export function IngredientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ingredient = useIngredient(id);
  const lookup = useLookupIngredient();

  if (ingredient.isLoading) return <LoadingBlock />;
  if (ingredient.isError || !ingredient.data) {
    return (
      <>
        <PageHeader title="Ingrediente" back={{ to: '/ingredientes', label: 'Ingredientes' }} />
        <ErrorState error={ingredient.error} onRetry={() => void ingredient.refetch()} />
      </>
    );
  }
  const data = ingredient.data;

  const registerLookup = async () => {
    const analysis = await lookup.mutateAsync(data.name);
    navigate(`/ingredientes/consultas/${analysis.id}`);
  };

  return (
    <>
      <PageHeader
        title={data.name}
        back={{ to: '/ingredientes', label: 'Ingredientes' }}
        actions={
          <Button
            variant="secondary"
            onClick={() => void registerLookup()}
            loading={lookup.isPending}
            icon={<Sparkles size={16} aria-hidden="true" />}
          >
            Consultar e salvar no histórico
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-6">
          {lookup.isError && <ErrorState error={lookup.error} />}
          <IngredientReference ingredient={data} />
          <EducationalDisclaimer />
        </div>
        <aside className="panel h-fit p-5">
          <h2 className="mb-3 text-base font-semibold">Nos seus produtos</h2>
          {data.userProducts && data.userProducts.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {data.userProducts.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/produtos/${product.id}`}
                    className="-mx-2 block rounded-[var(--radius-control)] px-2 py-1.5 hover:bg-mist"
                  >
                    <span className="block font-medium">{product.name}</span>
                    <span className="block text-sm text-ink-soft">{product.brand}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">Nenhum produto do seu catálogo contém este ingrediente.</p>
          )}
        </aside>
      </div>
    </>
  );
}
