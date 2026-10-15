import { Link } from 'react-router';
import { cn } from './cn';

export interface ChipIngredient {
  id: string;
  name: string;
  position?: number;
  isCurated?: boolean;
}

interface IngredientChipsProps {
  ingredients: ChipIngredient[];
  /** Ids que recebem o destaque de marca-texto (ex.: ingredientes em comum). */
  highlightIds?: Set<string>;
  /** Ids exibidos com borda tracejada (ex.: sem informação verificada na base). */
  mutedIds?: Set<string>;
  showPosition?: boolean;
  linkable?: boolean;
  label: string;
}

/** Lista de ingredientes na ordem do rótulo. */
export function IngredientChips({
  ingredients,
  highlightIds,
  mutedIds,
  showPosition,
  linkable = true,
  label,
}: IngredientChipsProps) {
  if (ingredients.length === 0) {
    return <p className="text-sm text-ink-soft">Nenhum ingrediente.</p>;
  }
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {ingredients.map((item) => {
        const highlighted = highlightIds?.has(item.id);
        const muted = !highlighted && mutedIds?.has(item.id);
        const content = (
          <>
            {showPosition && item.position !== undefined && (
              <span className="tabular-nums text-ink-soft" aria-label={`posição ${item.position}`}>
                {item.position}
              </span>
            )}
            <span>{item.name}</span>
          </>
        );
        const classes = cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors',
          highlighted
            ? 'border-sun bg-sun-soft font-semibold text-graphite'
            : muted
              ? 'border-dashed border-stone bg-white text-ink-soft'
              : 'border-line bg-white text-graphite',
          linkable && 'hover:border-graphite',
        );
        return (
          <li key={item.id}>
            {linkable ? (
              <Link to={`/ingredientes/${item.id}`} className={classes}>
                {content}
              </Link>
            ) : (
              <span className={classes}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
