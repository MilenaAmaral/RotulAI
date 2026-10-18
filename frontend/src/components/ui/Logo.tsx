import { cn } from './cn';

/**
 * Logotipo tipográfico: "Rotul" em grafite e "ai" em verde sobre uma faixa de marca-texto menta,
 * como um trecho destacado em um rótulo.
 */
export function Logo({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-display text-[1.45rem] font-bold tracking-[-0.03em] text-graphite',
        className,
      )}
    >
      <span>Rotul</span>
      <span
        className={cn('rounded-[3px] px-[0.08em] text-brand', animated ? 'logo-sweep' : 'bg-brand-mark')}
        style={{ fontVariationSettings: '"wdth" 85' }}
      >
        ai
      </span>
      <span className="sr-only"> (página inicial)</span>
    </span>
  );
}
