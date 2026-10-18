import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/States';
import { ApiError } from '../../lib/api';
import { CATEGORY_OPTIONS } from '../../lib/format';
import { parseIngredientText } from '../../lib/ingredients';
import type { ProductInput } from '../../types/api';
import type { ProductFormValues } from './product-form-schema';
import { emptyProductForm, productFormSchema, toProductInput } from './product-form-schema';

interface ProductFormProps {
  defaultValues?: ProductFormValues;
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<unknown>;
  onCancel: () => void;
}

const serverFieldMap: Record<string, keyof ProductFormValues> = {
  name: 'name',
  brand: 'brand',
  category: 'category',
  description: 'description',
  imageUrl: 'imageUrl',
  referenceUrl: 'referenceUrl',
  ingredients: 'ingredientsText',
};

export function ProductForm({ defaultValues = emptyProductForm, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
    setFocus,
  } = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues });
  const rootError = errors.root?.serverError;

  useEffect(() => {
    setFocus('name');
  }, [setFocus]);

  const ingredientCount = parseIngredientText(useWatch({ control, name: 'ingredientsText' }) ?? '').length;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toProductInput(values));
    } catch (error) {
      // Erros de validação do servidor são exibidos no campo correspondente.
      let mappedToField = false;
      if (error instanceof ApiError) {
        for (const detail of error.details) {
          const field = serverFieldMap[detail.field.split('.')[0] ?? ''];
          if (field) {
            setError(field, { message: detail.message });
            mappedToField = true;
          }
        }
      }
      if (!mappedToField) {
        setError('root.serverError', { message: error instanceof Error ? error.message : 'Falha ao salvar.' });
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {rootError?.message && <ErrorState error={new ApiError(400, 'FORM', rootError.message)} />}

      <div className="panel grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
        <TextField label="Nome do produto" error={errors.name?.message} {...register('name')} />
        <TextField label="Marca" error={errors.brand?.message} {...register('brand')} />
        <SelectField label="Categoria" error={errors.category?.message} {...register('category')}>
          {CATEGORY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Imagem"
          optional
          type="url"
          inputMode="url"
          placeholder="https://..."
          hint="Endereço público de uma imagem do produto."
          error={errors.imageUrl?.message}
          {...register('imageUrl')}
        />
        <div className="md:col-span-2">
          <TextAreaField
            label="Descrição"
            optional
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />
        </div>
      </div>

      <div className="panel p-5 sm:p-6">
        <TextAreaField
          label="Lista de ingredientes"
          rows={6}
          placeholder="Aqua, Glycerin, Niacinamide, Sodium Hyaluronate..."
          hint={
            <>
              Copie do rótulo, na mesma ordem. Separe por vírgula ou por linha.{' '}
              <span className="font-semibold text-graphite" aria-live="polite">
                {ingredientCount} {ingredientCount === 1 ? 'ingrediente identificado' : 'ingredientes identificados'}.
              </span>
            </>
          }
          error={errors.ingredientsText?.message}
          {...register('ingredientsText')}
        />
        <div className="mt-5">
          <TextField
            label="Fonte da lista de ingredientes"
            optional
            type="url"
            inputMode="url"
            placeholder="https://..."
            hint="Página do fabricante ou base pública onde a lista pode ser conferida."
            error={errors.referenceUrl?.message}
            {...register('referenceUrl')}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
