import { cn } from './cn';

/** Logotipo tipográfico: "Skin" em grafite e "AI" sob um traço de marca-texto. */
export function Logo({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-display text-[1.45rem] font-bold tracking-[-0.03em] text-graphite',
        className,
      )}
    >
      <span>Skin</span>
      <span
        className={cn('ml-[0.06em] rounded-[3px] px-[0.14em]', animated ? 'logo-sweep' : 'bg-sun')}
        style={{ fontVariationSettings: '"wdth" 85' }}
      >
        AI
      </span>
      <span className="sr-only"> (página inicial)</span>
    </span>
  );
}
