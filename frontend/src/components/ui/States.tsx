import { AlertCircle, Info, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '../../lib/api';
import { Button } from './Button';
import { cn } from './cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-panel)] border border-dashed border-stone/70 bg-white/60 px-6 py-10 sm:items-center sm:text-center">
      <div
        className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-graphite"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-ink-soft">{description}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-[var(--radius-panel)] border border-[#fecdca] bg-danger-soft px-5 py-4 sm:flex-row sm:items-center"
    >
      <AlertCircle className="shrink-0 text-danger" size={20} aria-hidden="true" />
      <p className="flex-1 text-graphite">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

type NoticeTone = 'info' | 'caution';

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === 'caution' ? ShieldAlert : Info;
  return (
    <div
      className={cn(
        'flex gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-sm',
        tone === 'caution' ? 'border-brand-accent/50 bg-brand-soft' : 'border-line bg-mist',
        className,
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0 text-graphite" aria-hidden="true" />
      <div className="text-graphite">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-ink-soft [&_strong]:text-graphite">{children}</div>
      </div>
    </div>
  );
}

/** Aviso padrão de responsabilidade das informações (seção 11 do projeto). */
export function EducationalDisclaimer({ className }: { className?: string }) {
  return (
    <Notice tone="caution" className={className}>
      Conteúdo educacional. O Rotulai não diagnostica, não prescreve tratamentos e não garante ausência de alergias.
      Para orientação individual, consulte um dermatologista.
    </Notice>
  );
}
