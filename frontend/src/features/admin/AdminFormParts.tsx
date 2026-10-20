import type { ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

export function Feedback({ error }: { error: unknown }) {
  return error ? (
    <div className="mt-3">
      <ErrorState error={error} />
    </div>
  ) : null;
}

/** Cabeçalho do formulário lateral; o modo depende do id em edição, não da lista filtrada. */
export function FormHeading({ isEditing, noun, onCancel }: { isEditing: boolean; noun: string; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{isEditing ? `Editar ${noun}` : `Adicionar ${noun}`}</h2>
      {isEditing && (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar edição
        </Button>
      )}
    </div>
  );
}

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  /** Mostra o carregamento somente na linha afetada. */
  editing?: boolean;
  deleting?: boolean;
  confirmMessage: string;
}

export function RowActions({ onEdit, onDelete, editing = false, deleting = false, confirmMessage }: RowActionsProps) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" loading={editing} onClick={onEdit}>
        Editar
      </Button>
      <Button
        size="sm"
        variant="danger"
        loading={deleting}
        onClick={() => {
          if (window.confirm(confirmMessage)) onDelete();
        }}
      >
        Excluir
      </Button>
    </div>
  );
}
