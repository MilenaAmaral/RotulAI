import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-6 flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        icon={<ChevronLeft size={16} aria-hidden="true" />}
      >
        Anterior
      </Button>
      <span className="text-sm text-ink-soft" aria-live="polite">
        Página {page} de {totalPages}
      </span>
      <Button variant="secondary" size="sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Próxima
        <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </nav>
  );
}
