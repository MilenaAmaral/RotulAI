import { zodResolver } from '@hookform/resolvers/zod';
import { FlaskConical, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { inputClass } from '../../components/ui/styles';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';
import { formatRelative } from '../../lib/format';
import { useAnalyses, useIngredientSearch, useLookupIngredient } from '../../lib/queries';

const lookupSchema = z.object({
  query: z.string().trim().min(2, 'Digite pelo menos 2 caracteres.').max(120, 'Máximo de 120 caracteres.'),
});

function LookupForm() {
  const navigate = useNavigate();
  const lookup = useLookupIngredient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof lookupSchema>>({ resolver: zodResolver(lookupSchema) });

  const onSubmit = handleSubmit(async ({ query }) => {
    const analysis = await lookup.mutateAsync(query);
    navigate(`/ingredientes/consultas/${analysis.id}`);
  });

  return (
    <section aria-labelledby="consultar" className="panel p-5 sm:p-6">
      <h2 id="consultar" className="text-lg font-semibold">
        Consultar um ingrediente
      </h2>
      <p className="mt-1 mb-4 text-ink-soft">
        Digite o nome como aparece no rótulo (INCI) ou um nome comum, como "vitamina C".
      </p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="consulta" className="sr-only">
            Nome do ingrediente
          </label>
          <input
            id="consulta"
            placeholder="Ex.: Niacinamide"
            aria-invalid={errors.query ? true : undefined}
            aria-describedby={errors.query ? 'consulta-erro' : undefined}
            className={`${inputClass} ${errors.query ? 'border-danger' : ''}`}
            {...register('query')}
          />
          {errors.query && (
            <p id="consulta-erro" className="mt-1.5 text-sm font-medium text-danger">
              {errors.query.message}
            </p>
          )}
        </div>
        <Button type="submit" loading={lookup.isPending} icon={<Search size={16} aria-hidden="true" />}>
          Consultar
        </Button>
      </form>
      {lookup.isError && (
        <div className="mt-3">
          <ErrorState error={lookup.error} />
        </div>
      )}
    </section>
  );
}

function ReferenceCatalog() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useIngredientSearch({ q: q.trim() || undefined, curatedOnly: true, page });

  return (
    <section aria-labelledby="catalogo-ingredientes" className="panel p-5 sm:p-6">
      <h2 id="catalogo-ingredientes" className="text-lg font-semibold">
        Base de referência
      </h2>
      <p className="mt-1 mb-4 text-sm text-ink-soft">Ingredientes com conteúdo revisado e fontes para verificação.</p>
      <label htmlFor="filtro-base" className="sr-only">
        Filtrar base de referência
      </label>
      <input
        id="filtro-base"
        type="search"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setPage(1);
        }}
        placeholder="Filtrar por nome"
        className={`${inputClass} mb-4`}
      />
      {search.isLoading && <LoadingBlock />}
      {search.isError && <ErrorState error={search.error} onRetry={() => void search.refetch()} />}
      {search.data && search.data.items.length === 0 && (
        <p className="text-ink-soft">Nenhum ingrediente da base corresponde ao filtro.</p>
      )}
      {search.data && search.data.items.length > 0 && (
        <>
          <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {search.data.items.map((item) => (
              <li
                key={item.id}
                className="border-b border-line last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
              >
                <Link
                  to={`/ingredientes/${item.id}`}
                  className="-mx-2 block rounded-[var(--radius-control)] px-2 py-2.5 hover:bg-mist/70"
                >
                  <span className="block font-semibold">{item.name}</span>
                  <span className="block truncate text-sm text-ink-soft">{item.functions.join(', ')}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={search.data.page} totalPages={search.data.totalPages} onChange={setPage} />
        </>
      )}
    </section>
  );
}

function RecentLookups() {
  const analyses = useAnalyses(1);
  return (
    <section aria-labelledby="consultas-recentes" className="panel p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="consultas-recentes" className="text-lg font-semibold">
          Suas consultas
        </h2>
        <Link
          to="/historico?aba=ingredientes"
          className="text-sm font-semibold underline decoration-sun decoration-2 underline-offset-4"
        >
          Ver histórico
        </Link>
      </div>
      {analyses.isLoading && <LoadingBlock />}
      {analyses.isError && <ErrorState error={analyses.error} />}
      {analyses.data?.items.length === 0 && (
        <p className="text-sm text-ink-soft">Você ainda não consultou ingredientes.</p>
      )}
      <ul className="divide-y divide-line">
        {analyses.data?.items.slice(0, 6).map((item) => (
          <li key={item.id}>
            <Link
              to={`/ingredientes/consultas/${item.id}`}
              className="-mx-2 flex items-center justify-between gap-3 rounded-[var(--radius-control)] px-2 py-2.5 hover:bg-mist/70"
            >
              <span className="min-w-0 truncate font-medium">{item.query}</span>
              <time dateTime={item.createdAt} className="shrink-0 text-xs text-ink-soft">
                {formatRelative(item.createdAt)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function IngredientsPage() {
  return (
    <>
      <PageHeader
        title="Ingredientes"
        description="Entenda o que cada ingrediente faz, com conteúdo revisado e explicações de IA claramente identificadas."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <LookupForm />
          <ReferenceCatalog />
        </div>
        <aside className="flex flex-col gap-6">
          <RecentLookups />
          <div className="flex items-start gap-3 rounded-[var(--radius-panel)] bg-sun-soft p-5 text-sm">
            <FlaskConical size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Informação sobre ingredientes é geral. A reação de cada pele depende da fórmula completa, da concentração
              e de fatores individuais.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
