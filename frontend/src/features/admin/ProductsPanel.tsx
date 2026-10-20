import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';
import { inputClass } from '../../components/ui/styles';
import { api } from '../../lib/api';
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from '../../lib/format';
import { parseIngredientText } from '../../lib/ingredients';
import { useAdminProducts, useDeleteAdminProduct, useSaveAdminProduct } from '../../lib/queries';
import type { AdminProduct, AdminProductInput, ProductCategory } from '../../types/api';
import { Feedback, Field, FormHeading, RowActions } from './AdminFormParts';
import { isProductCategory } from './admin-options';

export function ProductsPanel() {
  const [q, setQ] = useState('');
  const products = useAdminProducts({ q: q || undefined, page: 1, pageSize: 50 });
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('OUTRO');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [loadingEditId, setLoadingEditId] = useState<string>();
  const [editError, setEditError] = useState<unknown>();
  const save = useSaveAdminProduct(editingId);
  const remove = useDeleteAdminProduct();

  // A listagem não traz os ingredientes; o detalhe é buscado ao entrar em edição.
  const beginEdit = async (id: string) => {
    setEditingId(id);
    setEditError(undefined);
    setLoadingEditId(id);
    try {
      const product = await api<AdminProduct>(`/api/admin/products/${id}`);
      setName(product.name);
      setBrand(product.brand);
      setCategory(product.category);
      setReferenceUrl(product.referenceUrl ?? '');
      setIngredients(product.ingredients.map((ingredient) => ingredient.name).join('\n'));
    } catch (error) {
      setEditError(error);
    } finally {
      setLoadingEditId(undefined);
    }
  };

  const reset = () => {
    setEditingId(undefined);
    setName('');
    setBrand('');
    setCategory('OUTRO');
    setReferenceUrl('');
    setIngredients('');
    setEditError(undefined);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input: AdminProductInput = {
      name,
      brand,
      category,
      referenceUrl: referenceUrl.trim() || null,
      ingredients: parseIngredientText(ingredients),
    };
    save.mutate(input, { onSuccess: reset });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Produtos públicos</h2>
          <input
            className={inputClass}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar produtos"
            aria-label="Buscar produtos"
          />
        </div>
        {products.isLoading && <LoadingBlock label="Carregando produtos..." />}
        {products.isError && <ErrorState error={products.error} onRetry={() => void products.refetch()} />}
        <ul className="flex flex-col gap-2">
          {products.data?.items.map((product) => (
            <li key={product.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {product.brand} — {product.name}
                </p>
                <p className="text-sm text-ink-soft">{CATEGORY_LABELS[product.category]}</p>
              </div>
              <RowActions
                onEdit={() => void beginEdit(product.id)}
                onDelete={() => remove.mutate(product.id)}
                editing={loadingEditId === product.id}
                deleting={remove.isPending && remove.variables === product.id}
                confirmMessage={`Excluir ${product.brand} — ${product.name}?`}
              />
            </li>
          ))}
        </ul>
        <Feedback error={remove.error} />
      </div>
      <form className="panel flex h-fit flex-col gap-4 p-5" onSubmit={submit}>
        <FormHeading isEditing={editingId !== undefined} noun="produto" onCancel={reset} />
        {editError !== undefined ? <ErrorState error={editError} /> : null}
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
        <Field label="Marca">
          <input
            className={inputClass}
            required
            maxLength={80}
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
          />
        </Field>
        <Field label="Categoria">
          <select
            className={inputClass}
            value={category}
            onChange={(event) => {
              if (isProductCategory(event.target.value)) setCategory(event.target.value);
            }}
          >
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="URL da referência (opcional, https://)">
          <input
            className={inputClass}
            type="url"
            value={referenceUrl}
            onChange={(event) => setReferenceUrl(event.target.value)}
          />
        </Field>
        <Field label="Ingredientes (um por linha ou separados por vírgula; a ordem é preservada)">
          <textarea
            className={`${inputClass} min-h-32 py-2`}
            required
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
          />
        </Field>
        <Feedback error={save.error} />
        <Button type="submit" loading={save.isPending || loadingEditId !== undefined}>
          {editingId ? 'Salvar alterações' : 'Criar produto'}
        </Button>
      </form>
    </div>
  );
}
