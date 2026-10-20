import { ArrowLeftRight } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, ButtonLink } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useCreateComparison, useFavorites } from '../../lib/queries';

/** Limite de itens por página da API de favoritos. */
const FAVORITES_PAGE_SIZE = 50;

export function ComparePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const products = useFavorites(1, FAVORITES_PAGE_SIZE);
  const create = useCreateComparison();
  const [productAId, setProductAId] = useState(params.get('a') ?? '');
  const [productBId, setProductBId] = useState(params.get('b') ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!productAId || !productBId) return setFormError('Selecione os dois produtos.');
    if (productAId === productBId) return setFormError('Selecione dois produtos diferentes.');
    setFormError(null);
    const comparison = await create.mutateAsync({ productAId, productBId }).catch(() => null);
    if (comparison) navigate(`/comparar/${comparison.id}`);
  };

  return (
    <>
      <PageHeader
        title="Comparador"
        description="Compare dois dos seus favoritos: ingredientes em comum, exclusivos de cada um, marca e categoria."
      />

      {products.isLoading && <LoadingBlock />}
      {products.isError && <ErrorState error={products.error} onRetry={() => void products.refetch()} />}

      {products.data && products.data.total < 2 && (
        <EmptyState
          icon={<ArrowLeftRight size={20} />}
          title="Favorite pelo menos dois produtos"
          description="A comparação usa os produtos que você salvou do catálogo público. Favorite outro produto para comparar."
          action={<ButtonLink to="/catalogo">Explorar o catálogo</ButtonLink>}
        />
      )}

      {products.data && products.data.total >= 2 && (
        <form onSubmit={(event) => void submit(event)} noValidate className="panel flex flex-col gap-5 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              { label: 'Produto A', value: productAId, set: setProductAId },
              { label: 'Produto B', value: productBId, set: setProductBId },
            ].map((field) => (
              <SelectField
                key={field.label}
                label={field.label}
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
              >
                <option value="">Selecione um produto</option>
                {products.data.items.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.brand})
                  </option>
                ))}
              </SelectField>
            ))}
          </div>
          {products.data.total > products.data.items.length && (
            <p className="text-sm text-ink-soft">Mostrando os {FAVORITES_PAGE_SIZE} favoritos mais recentes.</p>
          )}
          {formError && (
            <p role="alert" className="text-sm font-medium text-danger">
              {formError}
            </p>
          )}
          {create.isError && <ErrorState error={create.error} />}
          <div>
            <Button type="submit" loading={create.isPending} icon={<ArrowLeftRight size={16} aria-hidden="true" />}>
              Comparar produtos
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
