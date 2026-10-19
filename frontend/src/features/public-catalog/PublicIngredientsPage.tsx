import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { ErrorState, EmptyState, EducationalDisclaimer } from '../../components/ui/States';
import { LoadingBlock } from '../../components/ui/Spinner';
import { inputClass } from '../../components/ui/styles';
import { usePublicIngredientFunctions, usePublicIngredients } from '../../lib/queries';
import { SeoMeta } from './SeoMeta';

export function PublicIngredientsPage() {
  const [q, setQ] = useState('');
  const [selectedFunction, setSelectedFunction] = useState('');
  const [page, setPage] = useState(1);
  const functions = usePublicIngredientFunctions();
  const ingredients = usePublicIngredients({ q: q.trim() || undefined, function: selectedFunction || undefined, page });

  return (
    <>
      <SeoMeta
        title="Referência de ingredientes cosméticos | Rotulai"
        description="Pesquise ingredientes cosméticos, funções, cuidados e fontes da base educativa curada do Rotulai."
        canonicalPath="/catalogo/ingredientes"
      />
      <PageHeader
        title="Referência de ingredientes"
        description="Conteúdo educativo curado, com fontes para verificação. Não é diagnóstico nem indicação de tratamento."
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="busca-ingredientes-publicos" className="sr-only">
            Buscar ingrediente
          </label>
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone"
            aria-hidden="true"
          />
          <input
            id="busca-ingredientes-publicos"
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome ou sinônimo"
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="sm:w-64">
          <label htmlFor="filtro-funcao-publico" className="sr-only">
            Filtrar por função cosmética
          </label>
          <select
            id="filtro-funcao-publico"
            value={selectedFunction}
            onChange={(event) => {
              setSelectedFunction(event.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">Todas as funções</option>
            {functions.data?.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      {ingredients.isLoading && <LoadingBlock label="Carregando ingredientes..." />}
      {ingredients.isError && <ErrorState error={ingredients.error} onRetry={() => void ingredients.refetch()} />}
      {ingredients.data?.total === 0 && (
        <EmptyState
          icon={<Search size={20} />}
          title="Nenhum ingrediente encontrado"
          description="Ajuste os termos ou remova o filtro de função."
        />
      )}
      {ingredients.data && ingredients.data.total > 0 && (
        <>
          <p className="mb-3 text-sm text-ink-soft" aria-live="polite">
            {ingredients.data.total} ingredientes com conteúdo curado
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ingredients.data.items.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/catalogo/ingredientes/${item.id}`}
                  className="panel block h-full p-5 transition-colors hover:border-brand-accent"
                >
                  <span className="font-semibold">{item.name}</span>
                  <span className="mt-2 block text-sm text-ink-soft">{item.functions.join(', ')}</span>
                  {item.synonyms.length > 0 && (
                    <span className="mt-2 block text-xs text-ink-soft">Também: {item.synonyms.join(', ')}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={ingredients.data.page} totalPages={ingredients.data.totalPages} onChange={setPage} />
        </>
      )}
      <EducationalDisclaimer className="mt-6" />
    </>
  );
}
