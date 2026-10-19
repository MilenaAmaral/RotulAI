import { ArrowLeftRight, BookOpen, FlaskConical, Heart, MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { LoadingBlock } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/States';
import { formatRelative, greeting, pluralize } from '../../lib/format';
import { useAiStatus, useDashboard, useFavorites } from '../../lib/queries';
import type { ActivityType, Dashboard } from '../../types/api';

const activityMeta: Record<ActivityType, { label: string; icon: ReactNode; href: (id: string) => string }> = {
  PRODUCT_CREATED: { label: 'Produto cadastrado', icon: <BookOpen size={16} />, href: (id) => `/produtos/${id}` },
  INGREDIENT_LOOKUP: {
    label: 'Ingrediente consultado',
    icon: <FlaskConical size={16} />,
    href: (id) => `/ingredientes/consultas/${id}`,
  },
  COMPARISON: { label: 'Comparação', icon: <ArrowLeftRight size={16} />, href: (id) => `/comparar/${id}` },
  CONVERSATION: { label: 'Conversa com a IA', icon: <MessageCircle size={16} />, href: (id) => `/assistente/${id}` },
};

function StatsLedger({ stats }: { stats: Dashboard['stats'] }) {
  const favorites = useFavorites(1, 1);
  const items = [
    { label: 'Favoritos', value: favorites.data?.total ?? 0, to: '/favoritos' },
    {
      label: 'Ingredientes consultados',
      value: stats.distinctIngredientsLookedUp,
      to: '/historico?aba=ingredientes',
      note: `${pluralize(stats.ingredientLookups, 'consulta', 'consultas')} no total`,
    },
    { label: 'Comparações realizadas', value: stats.comparisons, to: '/historico?aba=comparacoes' },
    { label: 'Conversas com a IA', value: stats.conversations, to: '/historico?aba=conversas' },
  ];
  return (
    <section aria-label="Resumo" className="panel grid grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
      {items.map((item, index) => (
        <Link
          key={item.label}
          to={item.to}
          className={[
            'group flex flex-col gap-1 p-5 transition-colors hover:bg-mist/60',
            index % 2 === 1 ? 'border-l border-line' : '',
            index >= 2 ? 'border-t border-line lg:border-t-0' : '',
            index === 2 ? 'lg:border-l' : '',
          ].join(' ')}
        >
          <span className="font-display text-[2.25rem] leading-none font-semibold tabular-nums">
            {item.value.toLocaleString('pt-BR')}
          </span>
          <span className="text-sm font-medium text-graphite">{item.label}</span>
          {item.note && <span className="text-xs text-ink-soft">{item.note}</span>}
        </Link>
      ))}
    </section>
  );
}

function RecentActivity({ items }: { items: Dashboard['recentActivity'] }) {
  return (
    <section aria-labelledby="atividade" className="panel p-5">
      <h2 id="atividade" className="mb-4 text-lg font-semibold">
        Atividade recente
      </h2>
      {items.length === 0 ? (
        <p className="text-ink-soft">
          Suas ações no Rotulai aparecerão aqui: produtos cadastrados, consultas, comparações e conversas.
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {items.map((item) => {
            const meta = activityMeta[item.type];
            return (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  to={meta.href(item.id)}
                  className="-mx-2 flex items-center gap-3 rounded-[var(--radius-control)] px-2 py-3 hover:bg-mist/70"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-graphite"
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="block text-xs text-ink-soft">{meta.label}</span>
                  </span>
                  <time dateTime={item.date} className="shrink-0 text-xs text-ink-soft">
                    {formatRelative(item.date)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function QuickAccess() {
  const aiStatus = useAiStatus();
  return (
    <section aria-labelledby="acesso-rapido" className="flex flex-col gap-3">
      <h2 id="acesso-rapido" className="sr-only">
        Acesso rápido
      </h2>
      <Link to="/catalogo" className="panel group flex items-start gap-4 p-5 hover:border-stone">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-brand text-white"
          aria-hidden="true"
        >
          <BookOpen size={20} />
        </span>
        <span>
          <span className="block font-semibold">Explorar catálogo público</span>
          <span className="block text-sm text-ink-soft">Pesquise produtos, categorias e ingredientes.</span>
        </span>
      </Link>
      <Link to="/favoritos" className="panel group flex items-start gap-4 p-5 hover:border-stone">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-brand-soft text-graphite"
          aria-hidden="true"
        >
          <Heart size={20} />
        </span>
        <span>
          <span className="block font-semibold">Ver favoritos</span>
          <span className="block text-sm text-ink-soft">Acesse os produtos que você salvou.</span>
        </span>
      </Link>
      <Link to="/assistente" className="panel group flex items-start gap-4 p-5 hover:border-stone">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-graphite text-white"
          aria-hidden="true"
        >
          <MessageCircle size={20} />
        </span>
        <span>
          <span className="block font-semibold">Falar com o assistente</span>
          <span className="block text-sm text-ink-soft">
            {aiStatus.data && !aiStatus.data.enabled
              ? 'A IA ainda não foi configurada neste servidor. Veja como habilitar.'
              : 'Tire dúvidas sobre termos de rótulos e ingredientes.'}
          </span>
        </span>
      </Link>
    </section>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const firstName = (dashboard.data?.userName ?? user?.name ?? '').split(' ')[0];

  return (
    <>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold sm:text-[2.4rem]">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-ink-soft">Este é o resumo do seu Rotulai.</p>
        </div>
      </header>

      {dashboard.isLoading && <LoadingBlock label="Carregando seu resumo..." />}
      {dashboard.isError && <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />}

      {dashboard.data && (
        <div className="flex flex-col gap-6">
          <StatsLedger stats={dashboard.data.stats} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <RecentActivity items={dashboard.data.recentActivity} />
            <QuickAccess />
          </div>
        </div>
      )}
    </>
  );
}
