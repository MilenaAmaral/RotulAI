import { useParams } from 'react-router';
import { AiExplanationPanel } from '../../components/AiExplanationPanel';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/Spinner';
import { EducationalDisclaimer, ErrorState, Notice } from '../../components/ui/States';
import { formatDateTime } from '../../lib/format';
import { useAnalysis, useExplainAnalysis } from '../../lib/queries';
import { IngredientReference } from './IngredientReference';

export function AnalysisPage() {
  const { id } = useParams();
  const analysis = useAnalysis(id);
  const explain = useExplainAnalysis();

  if (analysis.isLoading) return <LoadingBlock />;
  if (analysis.isError || !analysis.data) {
    return (
      <>
        <PageHeader title="Consulta" back={{ to: '/ingredientes', label: 'Ingredientes' }} />
        <ErrorState error={analysis.error} onRetry={() => void analysis.refetch()} />
      </>
    );
  }
  const data = analysis.data;
  const title = data.ingredient?.name ?? data.query;

  return (
    <>
      <PageHeader
        title={title}
        back={{ to: '/ingredientes', label: 'Ingredientes' }}
        description={
          <>
            Consulta por "{data.query}" em {formatDateTime(data.createdAt)}.
          </>
        }
      />
      <div className="flex flex-col gap-6">
        {data.ingredient ? (
          <IngredientReference ingredient={data.ingredient} />
        ) : (
          <Notice title="Não encontrado na base de referência">
            Não há informação confiável sobre <strong>"{data.query}"</strong> na base do Rotulai. Confira a grafia no
            rótulo ou peça uma explicação geral à IA, lembrando que ela pode não reconhecer nomes incomuns.
          </Notice>
        )}
        <AiExplanationPanel
          explanation={data.aiExplanation}
          onGenerate={() => {
            explain.reset();
            explain.mutate(data.id);
          }}
          generating={explain.isPending}
          error={explain.error}
          emptyText="Peça à IA uma explicação em linguagem simples. Ela fica separada do conteúdo revisado acima."
        />
        <EducationalDisclaimer />
      </div>
    </>
  );
}
