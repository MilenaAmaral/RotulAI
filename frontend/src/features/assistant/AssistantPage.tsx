import { MessageCircle, Plus, SendHorizontal, Sparkles, Trash2 } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router';
import { AiText } from '../../components/ui/AiText';
import { Button } from '../../components/ui/Button';
import { cn } from '../../components/ui/cn';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingBlock, Spinner } from '../../components/ui/Spinner';
import { EducationalDisclaimer, ErrorState, Notice } from '../../components/ui/States';
import { useToast } from '../../components/ui/toast-context';
import { errorMessage } from '../../lib/api';
import { formatRelative } from '../../lib/format';
import {
  useAiStatus,
  useConversation,
  useConversations,
  useDeleteHistoryItem,
  useProducts,
  useSendMessage,
} from '../../lib/queries';
import type { ChatMessage } from '../../types/api';

const STARTERS = [
  'O que significa INCI em um rótulo de cosmético?',
  'Qual a diferença entre ácido hialurônico e hialuronato de sódio?',
  'Como organizar a ordem de aplicação de uma rotina de skincare?',
];

function ConversationList({ activeId }: { activeId?: string }) {
  const conversations = useConversations(1);
  return (
    <nav aria-label="Conversas" className="flex flex-col gap-3">
      <Link
        to="/assistente"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-white px-4 font-semibold hover:bg-mist"
      >
        <Plus size={16} aria-hidden="true" />
        Nova conversa
      </Link>
      {conversations.isLoading && <Spinner className="mx-auto mt-4 text-ink-soft" />}
      {conversations.data?.items.length === 0 && <p className="px-1 text-sm text-ink-soft">Nenhuma conversa ainda.</p>}
      <ul className="flex flex-col gap-0.5">
        {conversations.data?.items.map((conversation) => (
          <li key={conversation.id}>
            <NavLink
              to={`/assistente/${conversation.id}`}
              aria-current={conversation.id === activeId ? 'page' : undefined}
              className={cn(
                'block rounded-[var(--radius-control)] px-3 py-2 transition-colors',
                conversation.id === activeId ? 'bg-sun-soft' : 'hover:bg-mist',
              )}
            >
              <span className="block truncate text-sm font-medium">{conversation.title}</span>
              <span className="block text-xs text-ink-soft">{formatRelative(conversation.updatedAt)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MessageBubble({ message }: { message: Pick<ChatMessage, 'role' | 'content'> }) {
  const isUser = message.role === 'USER';
  return (
    <li className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[92%] rounded-[14px] px-4 py-3 sm:max-w-[80%]',
          isUser ? 'rounded-br-[4px] bg-graphite text-white' : 'rounded-bl-[4px] border border-line bg-white',
        )}
      >
        <span className="sr-only">{isUser ? 'Você disse:' : 'Assistente SkinAI respondeu:'}</span>
        {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <AiText text={message.content} />}
      </div>
    </li>
  );
}

function ProductContextPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const products = useProducts({ pageSize: 50 });
  if (!products.data || products.data.items.length === 0) return null;
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id].slice(-2));
  return (
    <details className="group text-sm" open={selected.length > 0}>
      <summary className="cursor-pointer list-none font-medium text-ink-soft hover:text-graphite [&::-webkit-details-marker]:hidden">
        Usar produtos como contexto {selected.length > 0 ? `(${selected.length} de 2)` : '(opcional)'}
      </summary>
      <fieldset className="mt-2 flex max-h-36 flex-col gap-1 overflow-y-auto rounded-[var(--radius-control)] border border-line p-2">
        <legend className="sr-only">Selecione até 2 produtos</legend>
        {products.data.items.map((product) => (
          <label key={product.id} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-mist">
            <input
              type="checkbox"
              checked={selected.includes(product.id)}
              onChange={() => toggle(product.id)}
              className="size-4 accent-[#252525]"
            />
            <span className="truncate">
              {product.name} <span className="text-ink-soft">({product.brand})</span>
            </span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}

export function AssistantPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const aiStatus = useAiStatus();
  const conversation = useConversation(id);
  const send = useSendMessage();
  const remove = useDeleteHistoryItem('conversations');
  const [draft, setDraft] = useState('');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [productIds, setProductIds] = useState<string[]>(() =>
    params.get('produto') ? [params.get('produto') as string] : [],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const maxChars = aiStatus.data?.maxInputChars ?? 2000;
  const enabled = aiStatus.data?.enabled ?? false;
  const messages = id ? (conversation.data?.messages ?? []) : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, pendingMessage]);

  const submit = async (text: string) => {
    const message = text.trim();
    if (!message || message.length > maxChars || send.isPending) return;
    send.reset();
    setPendingMessage(message);
    setDraft('');
    try {
      const created = await send.mutateAsync({ conversationId: id, message, productIds });
      if (created) navigate(`/assistente/${created.id}`, { replace: true });
    } catch {
      setDraft(message);
    } finally {
      setPendingMessage(null);
      textareaRef.current?.focus();
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit(draft);
    }
  };

  const deleteConversation = async () => {
    if (!id) return;
    try {
      await remove.mutateAsync(id);
      notify('Conversa excluída.');
      navigate('/assistente', { replace: true });
    } catch (error) {
      notify(errorMessage(error), 'error');
    } finally {
      setConfirmingDelete(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">Assistente SkinAI</h1>
          <p className="mt-1.5 max-w-2xl text-ink-soft">
            Pergunte sobre termos de rótulos, ingredientes e organização da sua rotina.
          </p>
        </div>
        {id && conversation.data && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
            icon={<Trash2 size={16} aria-hidden="true" />}
          >
            Excluir conversa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1">
          <ConversationList activeId={id} />
        </aside>

        <section aria-label="Conversa" className="panel order-1 flex min-h-[60dvh] flex-col lg:order-2">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6" aria-live="polite" aria-busy={send.isPending}>
            {id && conversation.isLoading && <LoadingBlock label="Carregando conversa..." />}
            {id && conversation.isError && (
              <ErrorState error={conversation.error} onRetry={() => void conversation.refetch()} />
            )}

            {!id && !pendingMessage && (
              <div className="flex h-full flex-col justify-center gap-5 py-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-sun" aria-hidden="true">
                    <MessageCircle size={20} />
                  </span>
                  <h2 className="text-xl font-semibold">Como posso ajudar?</h2>
                </div>
                {enabled && (
                  <ul className="flex flex-col gap-2">
                    {STARTERS.map((starter) => (
                      <li key={starter}>
                        <button
                          type="button"
                          onClick={() => void submit(starter)}
                          className="w-full rounded-[var(--radius-control)] border border-line px-4 py-3 text-left hover:border-graphite hover:bg-mist/60"
                        >
                          {starter}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <ol className="flex flex-col gap-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {pendingMessage && <MessageBubble message={{ role: 'USER', content: pendingMessage }} />}
              {send.isPending && (
                <li className="flex items-center gap-2 text-sm text-ink-soft" role="status">
                  <Spinner size={16} />O assistente está escrevendo...
                </li>
              )}
            </ol>
            <div ref={endRef} />
          </div>

          <div className="border-t border-line p-4 sm:p-5">
            {aiStatus.data && !enabled ? (
              <Notice title="IA desabilitada neste servidor">{aiStatus.data.setupInstructions}</Notice>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-3">
                {send.isError && <ErrorState error={send.error} />}
                <ProductContextPicker selected={productIds} onChange={setProductIds} />
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label htmlFor="mensagem" className="sr-only">
                      Mensagem para o assistente
                    </label>
                    <textarea
                      id="mensagem"
                      ref={textareaRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={onKeyDown}
                      rows={2}
                      maxLength={maxChars + 200}
                      placeholder="Escreva sua pergunta. Enter envia, Shift + Enter quebra linha."
                      aria-describedby="contador-mensagem"
                      className="w-full resize-none rounded-[var(--radius-control)] border border-line px-3 py-2.5 focus:outline-none focus-visible:border-graphite"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!draft.trim() || draft.length > maxChars}
                    loading={send.isPending}
                    aria-label="Enviar mensagem"
                    className="h-11 w-11 px-0"
                  >
                    {!send.isPending && <SendHorizontal size={18} aria-hidden="true" />}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles size={13} aria-hidden="true" />
                    Respostas geradas por IA. Podem conter imprecisões.
                  </span>
                  <span id="contador-mensagem" className={draft.length > maxChars ? 'font-semibold text-danger' : ''}>
                    {draft.length}/{maxChars}
                  </span>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>

      <EducationalDisclaimer className="mt-6" />

      <ConfirmDialog
        open={confirmingDelete}
        title="Excluir conversa?"
        description="Todas as mensagens desta conversa serão removidas permanentemente."
        confirmLabel="Excluir conversa"
        loading={remove.isPending}
        onConfirm={() => void deleteConversation()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
