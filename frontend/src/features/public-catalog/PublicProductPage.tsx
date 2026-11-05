import { Link, useParams } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EducationalDisclaimer, ErrorState } from '../../components/ui/States';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ApiError } from '../../lib/api';
import { CATEGORY_LABELS } from '../../lib/format';
import { usePublicProduct } from '../../lib/queries';
import { SeoMeta } from './SeoMeta';
import { FavoriteButton } from './FavoriteButton';

export function PublicProductPage() {
  const { status } = useAuth();
  const { slug } = useParams();
  const product = usePublicProduct(slug);

  if (product.isLoading) return <LoadingBlock label="Carregando produto..." />;
  if (product.isError || !product.data) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <>
        <PageHeader title="Produto" back={{ to: '/catalogo', label: 'Catálogo público' }} />
        {notFound ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-[var(--radius-panel)] border border-[#fecdca] bg-danger-soft px-5 py-4 sm:flex-row sm:items-center"
          >
            <p className="flex-1 text-graphite">Este produto não existe ou foi removido.</p>
            <ButtonLink to="/catalogo" variant="secondary">
              Voltar ao catálogo
            </ButtonLink>
          </div>
        ) : (
          <ErrorState error={product.error} onRetry={() => void product.refetch()} />
        )}
      </>
    );
  }

  const data = product.data;
  const description = `${data.brand} ${data.name}: categoria ${CATEGORY_LABELS[data.category]}, lista de ingredientes e referência. Conteúdo educacional, sem diagnóstico ou indicação de tratamento.`;

  return (
    <>
      <SeoMeta
        title={`${data.name} | RotulAI`}
        description={description}
        canonicalPath={`/catalogo/produtos/${data.slug}`}
      />
      <PageHeader
        title={data.name}
        description={data.brand}
        back={{ to: '/catalogo', label: 'Catálogo público' }}
        actions={<FavoriteButton productId={data.id} />}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-6">
          <section className="panel p-5 sm:p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-ink-soft">Marca</dt>
                <dd className="font-semibold">{data.brand}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">Categoria</dt>
                <dd className="font-semibold">{CATEGORY_LABELS[data.category]}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="ingredientes-produto-publico" className="panel p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="ingredientes-produto-publico" className="text-lg font-semibold">
                Ingredientes da lista de referência
              </h2>
              <Badge tone="outline">{data.ingredients.length} itens</Badge>
            </div>
            <ol className="flex flex-col gap-2">
              {data.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex items-start gap-3 border-b border-line pb-2 last:border-0">
                  <span className="w-7 shrink-0 text-right text-sm text-ink-soft">{ingredient.position}.</span>
                  {ingredient.isCurated ? (
                    <Link
                      to={`/catalogo/ingredientes/${ingredient.id}`}
                      className="font-medium underline decoration-brand-accent decoration-2 underline-offset-4"
                    >
                      {ingredient.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{ingredient.name}</span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-ink-soft">
              A ordem pode refletir a concentração, mas não informa quantidades exatas. Fórmulas mudam e variam por país
              ou lote; confira sempre a embalagem.
            </p>
            {data.referenceUrl && (
              <p className="mt-3 text-sm">
                <a
                  href={data.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline decoration-brand-accent decoration-2 underline-offset-4"
                >
                  Consultar a fonte da lista (abre em nova aba)
                </a>
              </p>
            )}
          </section>
          <EducationalDisclaimer />
        </div>
        <aside className="panel h-fit p-5">
          {status === 'authenticated' ? (
            <>
              <h2 className="font-semibold">Seus recursos pessoais</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Acesse seus favoritos e o assistente disponível no seu plano.
              </p>
              <Link
                to="/favoritos"
                className="mt-4 inline-flex rounded-[var(--radius-control)] bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                Ver favoritos
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Salve produtos e conheça seus recursos</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Crie uma conta gratuita para salvar favoritos e experimentar o assistente de IA. O catálogo público
                permanece disponível sem login.
              </p>
              <Link
                to="/cadastro"
                className="mt-4 inline-flex rounded-[var(--radius-control)] bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                Criar conta grátis
              </Link>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
