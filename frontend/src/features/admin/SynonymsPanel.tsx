import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';
import { inputClass } from '../../components/ui/styles';
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from '../../lib/format';
import { useAdminSearchSynonyms, useDeleteAdminSearchSynonym, useSaveAdminSearchSynonym } from '../../lib/queries';
import type { AdminSearchSynonymInput, ProductCategory } from '../../types/api';
import { Feedback, Field, FormHeading, RowActions } from './AdminFormParts';
import { isProductCategory, parseLines } from './admin-options';

export function SynonymsPanel() {
  const synonyms = useAdminSearchSynonyms();
  const [editingId, setEditingId] = useState<string>();
  const [phrase, setPhrase] = useState('');
  const [expansions, setExpansions] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const save = useSaveAdminSearchSynonym(editingId);
  const remove = useDeleteAdminSearchSynonym();

  const beginEdit = (id: string) => {
    const item = synonyms.data?.find((synonym) => synonym.id === id);
    if (!item) return;
    setEditingId(id);
    setPhrase(item.phrase);
    setExpansions(item.expansions.join('\n'));
    setCategory(item.category ?? '');
  };

  const reset = () => {
    setEditingId(undefined);
    setPhrase('');
    setExpansions('');
    setCategory('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input: AdminSearchSynonymInput = {
      phrase,
      expansions: parseLines(expansions),
      category: category || null,
    };
    save.mutate(input, { onSuccess: reset });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Sinônimos de busca</h2>
        {synonyms.isLoading && <LoadingBlock label="Carregando sinônimos..." />}
        {synonyms.isError && <ErrorState error={synonyms.error} onRetry={() => void synonyms.refetch()} />}
        <ul className="flex flex-col gap-2">
          {synonyms.data?.map((item) => (
            <li key={item.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {item.phrase} → {item.expansions.join(', ')}
                </p>
                <p className="text-sm text-ink-soft">
                  {item.category ? CATEGORY_LABELS[item.category] : 'Todas as categorias'}
                </p>
              </div>
              <RowActions
                onEdit={() => beginEdit(item.id)}
                onDelete={() => remove.mutate(item.id)}
                deleting={remove.isPending && remove.variables === item.id}
                confirmMessage={`Excluir o sinônimo “${item.phrase}”?`}
              />
            </li>
          ))}
        </ul>
        <Feedback error={remove.error} />
      </div>
      <form className="panel flex h-fit flex-col gap-4 p-5" onSubmit={submit}>
        <FormHeading isEditing={editingId !== undefined} noun="sinônimo" onCancel={reset} />
        <Field label="Termo procurado">
          <input
            className={inputClass}
            required
            minLength={2}
            maxLength={120}
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
          />
        </Field>
        <Field label="Expansões (uma por linha)">
          <textarea
            className={`${inputClass} min-h-24 py-2`}
            required
            value={expansions}
            onChange={(event) => setExpansions(event.target.value)}
          />
        </Field>
        <Field label="Categoria (opcional)">
          <select
            className={inputClass}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value === '' || isProductCategory(event.target.value) ? event.target.value : '')
            }
          >
            <option value="">Todas as categorias</option>
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Feedback error={save.error} />
        <Button type="submit" loading={save.isPending}>
          {editingId ? 'Salvar alterações' : 'Criar sinônimo'}
        </Button>
      </form>
    </div>
  );
}
