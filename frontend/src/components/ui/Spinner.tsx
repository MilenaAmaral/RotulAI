import { LoaderCircle } from 'lucide-react';
import { cn } from './cn';

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} className={cn('animate-spin', className)} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-ink-soft">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center gap-3 text-ink-soft">
      <Spinner />
      <span>Carregando o Rotulai...</span>
    </div>
  );
}
