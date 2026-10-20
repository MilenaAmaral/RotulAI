import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';
import { inputClass } from '../../components/ui/styles';
import { useAdminIngredients, useDeleteAdminIngredient, useSaveAdminIngredient } from '../../lib/queries';
import type { AdminIngredientInput } from '../../types/api';
import { Feedback, Field, FormHeading, RowActions } from './AdminFormParts';
import { parseLines, parseSources } from './admin-options';

export function IngredientsPanel() {
  const [q, setQ] = useState('');
  const ingredients = useAdminIngredients({ q: q || undefined, page: 1, pageSize: 50 });
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [synonyms, setSynonyms] = useState('');
  const [functions, setFunctions] = useState('');
  const [description, setDescription] = useState('');
  const [usageInfo, setUsageInfo] = useState('');
  const [cautions, setCautions] = useState('');
  const [sources, setSources] = useState('');
  const [formError, setFormError] = useState('');
  const save = useSaveAdminIngredient(editingId);
  const remove = useDeleteAdminIngredient();

  const beginEdit = (id: string) => {
    const ingredient = ingredients.data?.items.find((item) => item.id === id);
    if (!ingredient) return;
    setEditingId(id);
    setName(ingredient.name);
    setSynonyms(ingredient.synonyms.join('\n'));
    setFunctions(ingredient.functions.join('\n'));
    setDescription(ingredient.description ?? '');
    setUsageInfo(ingredient.usageInfo ?? '');
    setCautions(ingredient.cautions ?? '');
    setSources(
      ingredient.sources
        .map((source) => [source.title, source.publisher, source.url, source.note ?? ''].join(' | '))
        .join('\n'),
    );
    setFormError('');
  };

  const reset = () => {
    setEditingId(undefined);
    setName('');
    setSynonyms('');
    setFunctions('');
    setDescription('');
    setUsageInfo('');
    setCautions('');
    setSources('');
    setFormError('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsedSources = parseSources(sources);
    if (parsedSources.error) {
      setFormError(parsedSources.error);
      return;
    }
    const input: AdminIngredientInput = {
      name,
      synonyms: parseLines(synonyms),
      functions: parseLines(functions),
      description: description.trim() || null,
      usageInfo: usageInfo.trim() || null,
      cautions: cautions.trim() || null,
      sources: parsedSources.sources,
    };
    setFormError('');
    save.mutate(input, { onSuccess: reset });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Ingredientes da referência curada</h2>
          <input
            className={inputClass}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar ingredientes"
            aria-label="Buscar ingredientes"
          />
        </div>
        {ingredients.isLoading && <LoadingBlock label="Carregando ingredientes..." />}
        {ingredients.isError && <ErrorState error={ingredients.error} onRetry={() => void ingredients.refetch()} />}
        <ul className="flex flex-col gap-2">
          {ingredients.data?.items.map((ingredient) => (
            <li key={ingredient.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{ingredient.name}</p>
                <p className="text-sm text-ink-soft">
                  {ingredient.sources.length} fontes · {ingredient.functions.length} funções
                </p>
              </div>
              <RowActions
                onEdit={() => beginEdit(ingredient.id)}
                onDelete={() => remove.mutate(ingredient.id)}
                deleting={remove.isPending && remove.variables === ingredient.id}
                confirmMessage={`Excluir o ingrediente ${ingredient.name}?`}
              />
            </li>
          ))}
        </ul>
        <Feedback error={remove.error} />
      </div>
      <form className="panel flex h-fit flex-col gap-4 p-5" onSubmit={submit}>
        <FormHeading isEditing={editingId !== undefined} noun="ingrediente" onCancel={reset} />
        <Field label="Nome">
          <input
            className={inputClass}
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Sinônimos (um por linha)">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={synonyms}
            onChange={(event) => setSynonyms(event.target.value)}
          />
        </Field>
        <Field label="Funções (uma por linha)">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={functions}
            onChange={(event) => setFunctions(event.target.value)}
          />
        </Field>
        <Field label="Descrição">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field label="Informações de uso">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={usageInfo}
            onChange={(event) => setUsageInfo(event.target.value)}
          />
        </Field>
        <Field label="Cuidados">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={cautions}
            onChange={(event) => setCautions(event.target.value)}
          />
        </Field>
        <Field label="Fontes (uma por linha: título | publicação | URL https:// | observação opcional)">
          <textarea
            className={`${inputClass} min-h-24 py-2`}
            value={sources}
            onChange={(event) => setSources(event.target.value)}
          />
        </Field>
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Feedback error={save.error} />
        <Button type="submit" loading={save.isPending}>
          {editingId ? 'Salvar alterações' : 'Criar ingrediente'}
        </Button>
      </form>
    </div>
  );
}
