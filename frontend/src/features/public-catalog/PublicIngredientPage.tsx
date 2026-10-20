import { Link, useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { EducationalDisclaimer, ErrorState } from '../../components/ui/States';
import { LoadingBlock } from '../../components/ui/Spinner';
import { usePublicIngredient } from '../../lib/queries';
import { IngredientReference } from '../ingredients/IngredientReference';
import { SeoMeta } from './SeoMeta';

export function PublicIngredientPage() {
  const { id } = useParams();
  const ingredient = usePublicIngredient(id);

  if (ingredient.isLoading) return <LoadingBlock label="Carregando ingrediente..." />;
  if (ingredient.isError || !ingredient.data) {
    return (
      <>
        <PageHeader title="Ingrediente" back={{ to: '/catalogo/ingredientes', label: 'Ingredientes' }} />
        <ErrorState error={ingredient.error} onRetry={() => void ingredient.refetch()} />
      </>
    );
  }
  const data = ingredient.data;
  const summary = `${data.name}: funções cosméticas, informações gerais e fontes da referência educativa do Rotulai. Conteúdo sem diagnóstico ou indicação de tratamento.`;

  return (
    <>
      <SeoMeta
        title={`${data.name} — referência de ingrediente | Rotulai`}
        description={summary}
        canonicalPath={`/catalogo/ingredientes/${data.id}`}
      />
      <PageHeader title={data.name} back={{ to: '/catalogo/ingredientes', label: 'Referência de ingredientes' }} />
      <div className="flex flex-col gap-6">
        <IngredientReference ingredient={data} />
        <EducationalDisclaimer />
        <p className="text-sm text-ink-soft">
          Consultas pessoais e histórico ficam disponíveis após{' '}
          <Link to="/entrar" className="font-semibold underline">
            entrar
          </Link>
          .
        </p>
      </div>
    </>
  );
}
