import { useNavigate, useParams } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/toast-context';
import { formatIngredientText } from '../../lib/ingredients';
import { useProduct, useSaveProduct } from '../../lib/queries';
import { ProductForm } from './ProductForm';

export function NewProductPage() {
  const navigate = useNavigate();
  const save = useSaveProduct();
  const { notify } = useToast();

  return (
    <>
      <PageHeader
        title="Cadastrar produto"
        description="Preencha os dados do rótulo. Os ingredientes são vinculados ao catálogo de referência quando reconhecidos."
        back={{ to: '/produtos', label: 'Catálogo' }}
      />
      <ProductForm
        submitLabel="Cadastrar produto"
        onCancel={() => navigate('/produtos')}
        onSubmit={async (input) => {
          const product = await save.mutateAsync(input);
          notify('Produto cadastrado.');
          navigate(`/produtos/${product.id}`);
        }}
      />
    </>
  );
}

export function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProduct(id);
  const save = useSaveProduct(id);
  const { notify } = useToast();

  return (
    <>
      <PageHeader title="Editar produto" back={{ to: `/produtos/${id}`, label: 'Voltar ao produto' }} />
      {product.isLoading && <LoadingBlock />}
      {product.isError && <ErrorState error={product.error} onRetry={() => void product.refetch()} />}
      {product.data && (
        <ProductForm
          submitLabel="Salvar alterações"
          defaultValues={{
            name: product.data.name,
            brand: product.data.brand,
            category: product.data.category,
            description: product.data.description ?? '',
            imageUrl: product.data.imageUrl ?? '',
            referenceUrl: product.data.referenceUrl ?? '',
            ingredientsText: formatIngredientText(product.data.ingredients.map((item) => item.name)),
          }}
          onCancel={() => navigate(`/produtos/${id}`)}
          onSubmit={async (input) => {
            await save.mutateAsync(input);
            notify('Alterações salvas.');
            navigate(`/produtos/${id}`);
          }}
        />
      )}
    </>
  );
}
