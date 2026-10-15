import { ArrowLeftRight, FlaskConical, MessageCircle, Trash2 } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { cn } from '../../components/ui/cn';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { LoadingBlock } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useToast } from '../../components/ui/toast-context';
import { errorMessage } from '../../lib/api';
import { formatDateTime, pluralize } from '../../lib/format';
import type { HistoryResource } from '../../lib/queries';
import {
  useAnalyses,
  useClearHistory,
  useComparisons,
  useConversations,
  useDeleteHistoryItem,
  useHistoryPolicy,
} from '../../lib/queries';

type TabKey = 'ingredientes' | 'comparacoes' | 'conversas';

const TABS: Array<{ key: TabKey; label: string; resource: HistoryResource; icon: ReactNode }> = [
  {
    key: 'ingredientes',
    label: 'Ingredientes',
    resource: 'ingredient-analyses',
    icon: <FlaskConical size={16} aria-hidden="true" />,
  },
  {
    key: 'comparacoes',
    label: 'Comparações',
    resource: 'comparisons',
    icon: <ArrowLeftRight size={16} aria-hidden="true" />,
  },
  {
    key: 'conversas',
    label: 'Conversas',
    resource: 'conversations',
    icon: <MessageCircle size={16} aria-hidden="true" />,
  },
];

interface Row {
  id: string;
  href: string;
  title: string;
  meta: ReactNode;
  date: string;
}

function useTabData(tab: TabKey, page: number) {
  const analyses = useAnalyses(page);
  const comparisons = useComparisons(page);
  const conversations = useConversations(page);
  if (tab === 'ingredientes') {
    return {
      query: analyses,
      rows: analyses.data?.items.map<Row>((item) => ({
        id: item.id,
        href: `/ingredientes/consultas/${item.id}`,
        title: item.query,
        meta: (
          <>
            {item.foundInCatalog ? (
              <Badge tone="success">Na base de referência</Badge>
            ) : (
              <Badge>Sem informação verificada</Badge>
            )}
            {item.aiExplanation && <Badge tone="sun">Com explicação da IA</Badge>}
          </>
        ),
        date: item.createdAt,
      })),
    };
  }
  if (tab === 'comparacoes') {
    return {
      query: comparisons,
      rows: comparisons.data?.items.map<Row>((item) => ({
        id: item.id,
        href: `/comparar/${item.id}`,
        title: `${item.result.productA.name} x ${item.result.productB.name}`,
        meta: (
          <>
            <Badge tone="outline">{item.result.overlapPercentage}% de sobreposição</Badge>
            {item.aiExplanation && <Badge tone="sun">Com explicação da IA</Badge>}
          </>
        ),
        date: item.createdAt,
      })),
    };
  }
  return {
    query: conversations,
    rows: conversations.data?.items.map<Row>((item) => ({
      id: item.id,
      href: `/assistente/${item.id}`,
      title: item.title,
      meta: <Badge tone="outline">{pluralize(item.messageCount, 'mensagem', 'mensagens')}</Badge>,
      date: item.updatedAt,
    })),
  };
}

function HistoryTab({ tab }: { tab: (typeof TABS)[number] }) {
  const [page, setPage] = useState(1);
  const { notify } = useToast();
  const { query, rows } = useTabData(tab.key, page);
  const removeItem = useDeleteHistoryItem(tab.resource);
  const clearAll = useClearHistory(tab.resource);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeItem.mutateAsync(pendingDelete.id);
      notify('Registro excluído.');
      if (rows?.length === 1 && page > 1) setPage(page - 1);
    } catch (error) {
      notify(errorMessage(error), 'error');
    } finally {
      setPendingDelete(null);
    }
  };

  const confirmClearAll = async () => {
    try {
      const { deleted } = await clearAll.mutateAsync();
      notify(`${pluralize(deleted, 'registro excluído', 'registros excluídos')}.`);
      setPage(1);
    } catch (error) {
      notify(errorMessage(error), 'error');
    } finally {
      setConfirmClear(false);
    }
  };

  const total = query.data?.total ?? 0;

  return (
    <div>
      {query.isLoading && <LoadingBlock />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && total === 0 && (
        <EmptyState
          icon={tab.icon}
          title={`Nenhum registro em ${tab.label.toLowerCase()}`}
          description="Quando você usar esta área do SkinAI, os registros aparecerão aqui."
        />
      )}
      {rows && total > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink-soft">{pluralize(total, 'registro', 'registros')}</p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmClear(true)}
              icon={<Trash2 size={14} aria-hidden="true" />}
            >
              Limpar {tab.label.toLowerCase()}
            </Button>
          </div>
          <ul className="panel divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Link to={row.href} className="min-w-0 flex-1 rounded hover:underline">
                  <span className="block truncate font-semibold">{row.title}</span>
                </Link>
                <span className="hidden flex-wrap gap-1.5 md:flex">{row.meta}</span>
                <time dateTime={row.date} className="hidden shrink-0 text-sm text-ink-soft sm:block">
                  {formatDateTime(row.date)}
                </time>
                <button
                  type="button"
                  onClick={() => setPendingDelete(row)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-soft hover:bg-danger-soft hover:text-danger"
                  aria-label={`Excluir "${row.title}"`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={query.data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir registro?"
        description={`"${pendingDelete?.title ?? ''}" será removido do histórico permanentemente.`}
        confirmLabel="Excluir registro"
        loading={removeItem.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmDialog
        open={confirmClear}
        title={`Limpar ${tab.label.toLowerCase()}?`}
        description={`Todos os ${pluralize(total, 'registro', 'registros')} desta aba serão excluídos permanentemente. Seus produtos não são afetados.`}
        confirmLabel="Limpar histórico"
        loading={clearAll.isPending}
        onConfirm={() => void confirmClearAll()}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

function RetentionPolicy() {
  const policy = useHistoryPolicy();
  if (!policy.data) return null;
  return (
    <section aria-labelledby="retencao" className="rounded-[var(--radius-panel)] bg-white/70 p-5 ring-1 ring-line">
      <h2 id="retencao" className="mb-2 text-base font-semibold">
        Como guardamos seus dados
      </h2>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
        {policy.data.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const active = TABS.find((tab) => tab.key === params.get('aba')) ?? TABS[0]!;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (key: TabKey) => setParams({ aba: key }, { replace: true });

  // Navegação por setas entre abas (padrão WAI-ARIA).
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.key === active.key);
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const nextIndex = (index + delta + TABS.length) % TABS.length;
    select(TABS[nextIndex]!.key);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <>
      <PageHeader
        title="Histórico"
        description="Consultas, comparações e conversas salvas. Você pode excluir qualquer registro."
      />
      <div
        role="tablist"
        aria-label="Tipos de histórico"
        onKeyDown={onKeyDown}
        className="mb-5 flex gap-1 overflow-x-auto border-b border-line"
      >
        {TABS.map((tab, index) => {
          const selected = tab.key === active.key;
          return (
            <button
              key={tab.key}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`aba-${tab.key}`}
              aria-selected={selected}
              aria-controls={`painel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.key)}
              className={cn(
                '-mb-px inline-flex items-center gap-2 border-b-[3px] px-3 py-2.5 font-semibold whitespace-nowrap transition-colors',
                selected ? 'border-sun text-graphite' : 'border-transparent text-ink-soft hover:text-graphite',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`painel-${active.key}`} aria-labelledby={`aba-${active.key}`} className="mb-8">
        <HistoryTab key={active.key} tab={active} />
      </div>
      <RetentionPolicy />
    </>
  );
}
