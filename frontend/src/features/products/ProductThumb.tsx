import { useState } from 'react';
import { cn } from '../../components/ui/cn';

/** Miniatura do produto: usa a imagem informada ou as iniciais do nome. */
export function ProductThumb({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string;
  imageUrl: string | null;
  size?: 'md' | 'lg';
}) {
  const [failed, setFailed] = useState(false);
  const classes = cn(
    'shrink-0 overflow-hidden rounded-[var(--radius-control)] border border-line bg-mist',
    size === 'md' ? 'size-12' : 'size-24 sm:size-28',
  );
  if (imageUrl && !failed) {
    return (
      <span className={classes}>
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return (
    <span
      className={cn(
        classes,
        'flex items-center justify-center font-display font-semibold text-ink-soft',
        size === 'lg' && 'text-2xl',
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
