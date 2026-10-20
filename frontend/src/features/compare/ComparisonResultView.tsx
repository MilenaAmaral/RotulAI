import { Check, Minus } from 'lucide-react';
import { Link } from 'react-router';
import { IngredientChips } from '../../components/ui/IngredientChips';
import { CATEGORY_LABELS, pluralize } from '../../lib/format';
import type { ComparisonProductSummary, ComparisonResult } from '../../types/api';

/** Comparações do catálogo levam à página pública; as antigas, ao registro pessoal arquivado. */
const productHref = (product: ComparisonProductSummary) =>
  product.slug ? `/catalogo/produtos/${product.slug}` : `/produtos/${product.id}`;

function SameFlag({ same, label }: { same: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {same ? (
        <Check size={16} className="text-success" aria-hidden="true" />
      ) : (
        <Minus size={16} className="text-stone" aria-hidden="true" />
      )}
      {same ? `Mesma ${label}` : `${label.charAt(0).toUpperCase()}${label.slice(1)} diferente`}
    </span>
  );
}

export function ComparisonResultView({ result }: { result: ComparisonResult }) {
  const { productA, productB } = result;
  const commonForChips = result.commonIngredients.map((item) => ({ id: item.id, name: item.name }));

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Produtos comparados" className="panel grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
        {[productA, productB].map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            className={`p-5 sm:p-6 ${index === 1 ? 'border-t border-line md:order-3 md:border-t-0' : ''}`}
          >
            <p className="text-sm font-semibold text-ink-soft">Produto {index === 0 ? 'A' : 'B'}</p>
            <h2 className="mt-1 text-xl font-semibold">
              <Link to={productHref(product)} className="hover:underline">
                {product.name}
              </Link>
            </h2>
            <p className="text-ink-soft">
              {product.brand}, {CATEGORY_LABELS[product.category]}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              {pluralize(product.ingredientCount, 'ingrediente', 'ingredientes')}
            </p>
            {product.description && <p className="mt-3 max-w-prose text-sm">{product.description}</p>}
          </div>
        ))}
        <div className="flex flex-col items-center justify-center gap-2 border-t border-line bg-mist/60 px-6 py-5 md:order-2 md:border-x md:border-t-0">
          <span className="font-display text-[2.5rem] leading-none font-semibold tabular-nums">
            {result.overlapPercentage}%
          </span>
          <span className="text-center text-sm text-ink-soft">de sobreposição</span>
          <div className="mt-1 flex flex-col items-center gap-1">
            <SameFlag same={result.sameBrand} label="marca" />
            <SameFlag same={result.sameCategory} label="categoria" />
          </div>
        </div>
      </section>

      <section aria-labelledby="em-comum" className="panel p-5 sm:p-6">
        <h2 id="em-comum" className="mb-1 text-lg font-semibold">
          <span className="highlight">Em comum</span>{' '}
          <span className="text-base font-normal text-ink-soft">({result.commonIngredients.length})</span>
        </h2>
        <p className="mb-4 text-sm text-ink-soft">Ingredientes presentes nos dois rótulos, na ordem do produto A.</p>
        <IngredientChips
          ingredients={commonForChips}
          highlightIds={new Set(commonForChips.map((item) => item.id))}
          label="Ingredientes em comum"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section aria-labelledby="so-a" className="panel p-5 sm:p-6">
          <h2 id="so-a" className="mb-4 text-lg font-semibold">
            Só no produto A <span className="text-base font-normal text-ink-soft">({result.exclusiveToA.length})</span>
          </h2>
          <IngredientChips ingredients={result.exclusiveToA} showPosition label={`Exclusivos de ${productA.name}`} />
        </section>
        <section aria-labelledby="so-b" className="panel p-5 sm:p-6">
          <h2 id="so-b" className="mb-4 text-lg font-semibold">
            Só no produto B <span className="text-base font-normal text-ink-soft">({result.exclusiveToB.length})</span>
          </h2>
          <IngredientChips ingredients={result.exclusiveToB} showPosition label={`Exclusivos de ${productB.name}`} />
        </section>
      </div>

      <p className="text-sm text-ink-soft">
        A sobreposição mede quantos ingredientes os rótulos compartilham. Ela não indica qualidade, eficácia nem qual
        produto é mais adequado para você. Os números ao lado dos ingredientes mostram a posição no rótulo.
      </p>
    </div>
  );
}
