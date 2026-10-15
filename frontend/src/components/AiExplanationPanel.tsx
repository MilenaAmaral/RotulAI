import { Sparkles } from 'lucide-react';
import { useAiStatus } from '../lib/queries';
import type { AiExplanation } from '../types/api';
import { AiText } from './ui/AiText';
import { Button } from './ui/Button';
import { ErrorState, Notice } from './ui/States';

interface AiExplanationPanelProps {
  explanation: AiExplanation | null;
  onGenerate: () => void;
  generating: boolean;
  error: unknown;
  emptyText: string;
}

/**
 * Bloco visualmente separado para conteúdo gerado por IA, sempre identificado como tal.
 */
export function AiExplanationPanel({ explanation, onGenerate, generating, error, emptyText }: AiExplanationPanelProps) {
  const status = useAiStatus();
  const enabled = status.data?.enabled ?? false;

  return (
    <section
      aria-labelledby="ai-explanation-title"
      className="rounded-[var(--radius-panel)] border border-dashed border-stone bg-white p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="ai-explanation-title" className="flex items-center gap-2 text-base font-semibold">
          <Sparkles size={18} aria-hidden="true" />
          Explicação gerada por IA
        </h2>
        {explanation?.model && <span className="text-xs text-ink-soft">Modelo: {explanation.model}</span>}
      </div>

      {explanation ? (
        <>
          <AiText text={explanation.text} />
          <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft">
            Texto gerado automaticamente por um modelo de linguagem. Pode conter imprecisões e não substitui fontes
            oficiais nem orientação de um dermatologista.
          </p>
        </>
      ) : status.isLoading ? null : enabled ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-ink-soft">{emptyText}</p>
          <Button
            variant="secondary"
            onClick={onGenerate}
            loading={generating}
            icon={<Sparkles size={16} aria-hidden="true" />}
          >
            {generating ? 'Gerando explicação...' : 'Gerar explicação com IA'}
          </Button>
        </div>
      ) : (
        <Notice title="IA desabilitada neste servidor">{status.data?.setupInstructions}</Notice>
      )}

      {Boolean(error) && (
        <div className="mt-3">
          <ErrorState error={error} />
        </div>
      )}
    </section>
  );
}
