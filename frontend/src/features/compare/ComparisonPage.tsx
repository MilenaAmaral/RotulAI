import { useParams } from 'react-router';
import { AiExplanationPanel } from '../../components/AiExplanationPanel';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/Spinner';
import { EducationalDisclaimer, ErrorState } from '../../components/ui/States';
import { formatDateTime } from '../../lib/format';
import { useComparison, useExplainComparison } from '../../lib/queries';
import { ComparisonResultView } from './ComparisonResultView';

export function ComparisonPage() {
  const { id } = useParams();
  const comparison = useComparison(id);
  const explain = useExplainComparison();

  if (comparison.isLoading) return <LoadingBlock />;
  if (comparison.isError || !comparison.data) {
    return (
      <>
        <PageHeader title="Comparação" back={{ to: '/comparar', label: 'Comparador' }} />
        <ErrorState error={comparison.error} onRetry={() => void comparison.refetch()} />
      </>
    );
  }
  const data = comparison.data;

  return (
    <>
      <PageHeader
        title="Resultado da comparação"
        description={`Calculado pelas regras do SkinAI em ${formatDateTime(data.createdAt)}, com os dados dos produtos naquele momento.`}
        back={{ to: '/comparar', label: 'Comparador' }}
        actions={
          <ButtonLink to="/comparar" variant="secondary">
            Nova comparação
          </ButtonLink>
        }
      />
      <div className="flex flex-col gap-6">
        <ComparisonResultView result={data.result} />
        <AiExplanationPanel
          explanation={data.aiExplanation}
          onGenerate={() => {
            explain.reset();
            explain.mutate(data.id);
          }}
          generating={explain.isPending}
          error={explain.error}
          emptyText="A IA pode explicar em linguagem simples o papel dos ingredientes que diferem. Ela não indica qual produto é melhor para você."
        />
        <EducationalDisclaimer />
      </div>
    </>
  );
}
