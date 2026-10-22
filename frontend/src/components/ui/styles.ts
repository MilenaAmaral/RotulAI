import { cn } from './cn';

export const controlBase =
  'w-full rounded-[var(--radius-control)] border bg-white px-3 text-[15px] text-graphite placeholder:text-stone transition-colors focus:outline-none focus-visible:border-graphite focus-visible:shadow-[0_0_0_3px_var(--color-brand-mark)] disabled:bg-mist';

/** Classe para campos simples fora do FieldShell (busca, filtros). */
export const inputClass = cn(controlBase, 'h-10 border-line hover:border-stone');
