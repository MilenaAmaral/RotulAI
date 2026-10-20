import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';
import { inputClass } from '../../components/ui/styles';
import {
  useAdminIngredients,
  useAdminRecommendationRules,
  useDeleteAdminRecommendationRule,
  useSaveAdminRecommendationRule,
} from '../../lib/queries';
import type { RecommendationRuleInput, SkinConcern, SkinType } from '../../types/api';
import { Feedback, Field, FormHeading, RowActions } from './AdminFormParts';
import { CONCERNS, isSkinConcern, isSkinType, labelFor, SKIN_TYPES } from './admin-options';

export function RulesPanel() {
  const rules = useAdminRecommendationRules();
  const ingredients = useAdminIngredients({ page: 1, pageSize: 50 });
  const [editingId, setEditingId] = useState<string>();
  const [ingredientId, setIngredientId] = useState('');
  const [skinType, setSkinType] = useState<SkinType>('OILY');
  const [concern, setConcern] = useState<SkinConcern>('ACNE_PRONE');
  const [rationale, setRationale] = useState('');
  const [justification, setJustification] = useState('');
  const [isActive, setIsActive] = useState(true);
  const save = useSaveAdminRecommendationRule(editingId);
  const remove = useDeleteAdminRecommendationRule();

  const beginEdit = (id: string) => {
    const rule = rules.data?.find((item) => item.id === id);
    if (!rule) return;
    setEditingId(id);
    setIngredientId(rule.ingredientId);
    setSkinType(rule.skinType);
    setConcern(rule.concern);
    setRationale(rule.rationale);
    setJustification(rule.justification);
    setIsActive(rule.isActive);
  };

  const reset = () => {
    setEditingId(undefined);
    setIngredientId('');
    setSkinType('OILY');
    setConcern('ACNE_PRONE');
    setRationale('');
    setJustification('');
    setIsActive(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input: RecommendationRuleInput = { ingredientId, skinType, concern, rationale, justification, isActive };
    save.mutate(input, { onSuccess: reset });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Regras versionadas</h2>
        {rules.isLoading && <LoadingBlock label="Carregando regras..." />}
        {rules.isError && <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />}
        <ul className="flex flex-col gap-2">
          {rules.data?.map((rule) => (
            <li key={rule.id} className="panel flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {rule.ingredient.name} · {labelFor(SKIN_TYPES, rule.skinType)} · {labelFor(CONCERNS, rule.concern)}
                </p>
                <p className="text-sm">{rule.rationale}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {rule.justification} · versão {rule.version}
                  {rule.isActive ? '' : ' · inativa'}
                </p>
              </div>
              <RowActions
                onEdit={() => beginEdit(rule.id)}
                onDelete={() => remove.mutate(rule.id)}
                deleting={remove.isPending && remove.variables === rule.id}
                confirmMessage={`Excluir a regra de ${rule.ingredient.name}?`}
              />
            </li>
          ))}
        </ul>
        <Feedback error={remove.error} />
      </div>
      <form className="panel flex h-fit flex-col gap-4 p-5" onSubmit={submit}>
        <FormHeading isEditing={editingId !== undefined} noun="regra" onCancel={reset} />
        <Field label="Ingrediente curado">
          <select
            className={inputClass}
            required
            value={ingredientId}
            onChange={(event) => setIngredientId(event.target.value)}
          >
            <option value="">Selecione</option>
            {ingredients.data?.items
              .filter((ingredient) => ingredient.isCurated)
              .map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Tipo de pele">
          <select
            className={inputClass}
            value={skinType}
            onChange={(event) => {
              if (isSkinType(event.target.value)) setSkinType(event.target.value);
            }}
          >
            {SKIN_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preocupação">
          <select
            className={inputClass}
            value={concern}
            onChange={(event) => {
              if (isSkinConcern(event.target.value)) setConcern(event.target.value);
            }}
          >
            {CONCERNS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Motivo exibido para a pessoa usuária">
          <input
            className={inputClass}
            required
            minLength={5}
            maxLength={500}
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
          />
        </Field>
        <Field label="Justificativa editorial e científica">
          <textarea
            className={`${inputClass} min-h-24 py-2`}
            required
            minLength={10}
            maxLength={1200}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          Regra ativa
        </label>
        <Feedback error={save.error} />
        <Button type="submit" loading={save.isPending}>
          {editingId ? 'Salvar alterações' : 'Criar regra'}
        </Button>
      </form>
    </div>
  );
}
