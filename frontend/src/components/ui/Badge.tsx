import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'sun' | 'outline' | 'success';

const tones: Record<Tone, string> = {
  neutral: 'bg-mist text-ink-soft',
  sun: 'bg-sun-soft text-graphite',
  outline: 'border border-line bg-white text-ink-soft',
  success: 'bg-success-soft text-success',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
