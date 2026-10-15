import { ArrowLeftRight, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { Button, ButtonLink } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IngredientChips } from '../../components/ui/IngredientChips';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/toast-context';
import { errorMessage } from '../../lib/api';
import { CATEGORY_LABELS, formatDate, pluralize } from '../../lib/format';
import { useDeleteProduct, useProduct } from '../../lib/queries';
import { ProductThumb } from './ProductThumb';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProduct(id);
  const remove = useDeleteProduct();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState(false);

  if (product.isLoading) return <LoadingBlock />;
  if (product.isError || !product.data) {
    return (
      <>
        <PageHeader title="Produto" back={{ to: '/produtos', label: 'Catálogo' }} />
        <ErrorState error={product.error} onRetry={() => void product.refetch()} />
      </>
    );
  }

  const data = product.data;
  const uncuratedIds = new Set(data.ingredients.filter((item) => !item.isCurated).map((item) => item.id));
  const curatedCount = data.ingredients.length - uncuratedIds.size;

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(data.id);
      notify('Produto excluído.');
      navigate('/produtos', { replace: true });
    } catch (error) {
      notify(errorMessage(error), 'error');
      setConfirming(false);
    }
  };

  return (
    <>
      <PageHeader
        title={data.name}
        back={{ to: '/produtos', label: 'Catálogo' }}
        actions={
          <>
            <ButtonLink
              to={`/produtos/${data.id}/editar`}
              variant="secondary"
              icon={<Pencil size={16} aria-hidden="true" />}
            >
              Editar
            </ButtonLink>
            <Button variant="danger" onClick={() => setConfirming(true)} icon={<Trash2 size={16} aria-hidden="true" />}>
              Excluir
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-6">
          <section className="panel flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
            <ProductThumb name={data.name} imageUrl={data.imageUrl} size="lg" />
            <dl className="grid flex-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-ink-soft">Marca</dt>
                <dd className="font-semibold">{data.brand}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">Categoria</dt>
                <dd className="font-semibold">{CATEGORY_LABELS[data.category]}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">Cadastrado em</dt>
                <dd>{formatDate(data.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">Ingredientes</dt>
                <dd>{pluralize(data.ingredients.length, 'item', 'itens')}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-ink-soft">Descrição</dt>
                <dd className="max-w-prose whitespace-pre-line">{data.description ?? 'Sem descrição.'}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="lista-ingredientes" className="panel p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="lista-ingredientes" className="text-lg font-semibold">
                Ingredientes na ordem do rótulo
              </h2>
              <Badge tone="sun">
                {curatedCount} de {data.ingredients.length} com informações na base de referência
              </Badge>
            </div>
            <IngredientChips
              ingredients={data.ingredients}
              mutedIds={uncuratedIds}
              showPosition
              label="Ingredientes do produto"
            />
            <p className="mt-4 text-sm text-ink-soft">
              {uncuratedIds.size > 0 &&
                'Ingredientes com borda tracejada ainda não têm conteúdo revisado na base do SkinAI. '}
              Selecione um ingrediente para ver os detalhes. A ordem do rótulo costuma refletir concentração
              decrescente, mas não informa a quantidade exata.
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-3">
          <ButtonLink
            to={`/comparar?a=${data.id}`}
            variant="secondary"
            icon={<ArrowLeftRight size={16} aria-hidden="true" />}
            className="justify-start"
          >
            Comparar com outro produto
          </ButtonLink>
          <ButtonLink
            to={`/assistente?produto=${data.id}`}
            variant="secondary"
            icon={<MessageCircle size={16} aria-hidden="true" />}
            className="justify-start"
          >
            Perguntar ao assistente
          </ButtonLink>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Excluir produto?"
        description={`"${data.name}" será removido do seu catálogo. Comparações já realizadas continuam no histórico. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir produto"
        loading={remove.isPending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
