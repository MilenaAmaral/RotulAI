import { BookOpen, ExternalLink } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Notice } from '../../components/ui/States';
import type { IngredientDetail } from '../../types/api';

/** Conteúdo da base de referência (curadoria do projeto), separado visualmente da IA. */
export function IngredientReference({ ingredient }: { ingredient: IngredientDetail }) {
  if (!ingredient.isCurated) {
    return (
      <Notice title="Sem informações verificadas">
        <strong>{ingredient.name}</strong> aparece em rótulos cadastrados, mas ainda não tem conteúdo revisado na base
        de referência do Rotulai. Não exibimos descrições sem fonte. Você pode pedir uma explicação geral à IA, que será
        identificada como tal.
      </Notice>
    );
  }

  const sections = [
    { title: 'O que é', text: ingredient.description },
    { title: 'Uso em cosméticos', text: ingredient.usageInfo },
    { title: 'Cuidados e limitações', text: ingredient.cautions },
  ].filter((section) => section.text);

  return (
    <section aria-labelledby="base-referencia" className="panel p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="base-referencia" className="flex items-center gap-2 text-base font-semibold">
          <BookOpen size={18} aria-hidden="true" />
          Base de referência do Rotulai
        </h2>
        <Badge tone="success">Conteúdo revisado</Badge>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Funções cosméticas">
        {ingredient.functions.map((fn) => (
          <Badge key={fn} tone="brand">
            {fn}
          </Badge>
        ))}
      </div>

      {ingredient.synonyms.length > 0 && (
        <p className="mb-5 text-sm text-ink-soft">
          <span className="font-semibold text-graphite">Também aparece como:</span> {ingredient.synonyms.join(', ')}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-1 text-[15px] font-semibold">{section.title}</h3>
            <p className="max-w-prose text-graphite/90">{section.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="mb-2 text-sm font-semibold">Fontes para verificação</h3>
        {ingredient.sources.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhuma fonte cadastrada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ingredient.sources.map((source) => (
              <li key={source.id} className="text-sm">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-graphite underline decoration-brand-accent decoration-2 underline-offset-4"
                >
                  {source.title}
                  <ExternalLink size={13} aria-hidden="true" />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
                <span className="text-ink-soft">, {source.publisher}</span>
                {source.note && <p className="text-ink-soft">{source.note}</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-soft">
          Texto educacional resumido pela equipe do projeto. As fontes servem para conferir nome INCI, funções
          registradas e restrições regulatórias; não são citação literal.
        </p>
      </div>
    </section>
  );
}
