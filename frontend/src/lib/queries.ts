import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AiStatus,
  ChatMessage,
  Comparison,
  Conversation,
  ConversationSummary,
  Dashboard,
  HistoryPolicy,
  IngredientAnalysis,
  IngredientDetail,
  IngredientSummary,
  Page,
  Product,
  ProductCategory,
  ProductInput,
  ProductListItem,
  PublicIngredient,
  PublicIngredientSummary,
  PublicProduct,
  PublicProductSearchPage,
} from '../types/api';
import { api, toQueryString } from './api';

/** Chaves centralizadas para invalidar caches de forma consistente. */
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  products: ['products'] as const,
  productList: (params: object) => ['products', 'list', params] as const,
  product: (id: string) => ['products', 'detail', id] as const,
  ingredients: (params: object) => ['ingredients', params] as const,
  ingredient: (id: string) => ['ingredient', id] as const,
  analyses: ['analyses'] as const,
  analysisList: (page: number) => ['analyses', 'list', page] as const,
  analysis: (id: string) => ['analyses', 'detail', id] as const,
  comparisons: ['comparisons'] as const,
  comparisonList: (page: number) => ['comparisons', 'list', page] as const,
  comparison: (id: string) => ['comparisons', 'detail', id] as const,
  conversations: ['conversations'] as const,
  conversationList: (page: number) => ['conversations', 'list', page] as const,
  conversation: (id: string) => ['conversations', 'detail', id] as const,
  aiStatus: ['ai-status'] as const,
  policy: ['history-policy'] as const,
  publicProducts: (params: object) => ['public-catalog', 'products', params] as const,
  publicProduct: (slug: string) => ['public-catalog', 'product', slug] as const,
  publicIngredients: (params: object) => ['public-catalog', 'ingredients', params] as const,
  publicIngredient: (id: string) => ['public-catalog', 'ingredient', id] as const,
  publicIngredientFunctions: ['public-catalog', 'ingredient-functions'] as const,
};

// ---------- Catálogo público ----------
export const usePublicProducts = (params: ProductListParams) =>
  useQuery({
    queryKey: queryKeys.publicProducts(params),
    queryFn: () =>
      api<PublicProductSearchPage>(`/api/catalog/products${toQueryString({ ...params })}`, { auth: false }),
    placeholderData: keepPreviousData,
  });

export const usePublicProduct = (slug: string | undefined) =>
  useQuery({
    queryKey: queryKeys.publicProduct(slug ?? ''),
    queryFn: () => api<PublicProduct>(`/api/catalog/products/${slug}`, { auth: false }),
    enabled: Boolean(slug),
  });

export const usePublicIngredients = (params: { q?: string; function?: string; page?: number }) =>
  useQuery({
    queryKey: queryKeys.publicIngredients(params),
    queryFn: () =>
      api<Page<PublicIngredientSummary>>(
        `/api/catalog/ingredients${toQueryString({ ...params, pageSize: 24 })}`,
        { auth: false },
      ),
    placeholderData: keepPreviousData,
  });

export const usePublicIngredient = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.publicIngredient(id ?? ''),
    queryFn: () => api<PublicIngredient>(`/api/catalog/ingredients/${id}`, { auth: false }),
    enabled: Boolean(id),
  });

export const usePublicIngredientFunctions = () =>
  useQuery({
    queryKey: queryKeys.publicIngredientFunctions,
    queryFn: () => api<string[]>('/api/catalog/ingredients/functions', { auth: false }),
    staleTime: 5 * 60_000,
  });

// ---------- Dashboard ----------
export const useDashboard = () =>
  useQuery({ queryKey: queryKeys.dashboard, queryFn: () => api<Dashboard>('/api/dashboard') });

// ---------- Produtos ----------
export interface ProductListParams {
  q?: string;
  category?: ProductCategory | '';
  page?: number;
  pageSize?: number;
}

export const useProducts = (params: ProductListParams) =>
  useQuery({
    queryKey: queryKeys.productList(params),
    queryFn: () => api<Page<ProductListItem>>(`/api/products${toQueryString({ ...params })}`),
    placeholderData: keepPreviousData,
  });

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.product(id ?? ''),
    queryFn: () => api<Product>(`/api/products/${id}`),
    enabled: Boolean(id),
  });

function useInvalidate() {
  const client = useQueryClient();
  return (...keys: ReadonlyArray<readonly unknown[]>) =>
    Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

export function useSaveProduct(id?: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ProductInput) =>
      id
        ? api<Product>(`/api/products/${id}`, { method: 'PUT', body: input })
        : api<Product>('/api/products', { method: 'POST', body: input }),
    onSuccess: () => invalidate(queryKeys.products, queryKeys.dashboard),
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(queryKeys.products, queryKeys.dashboard),
  });
}

// ---------- Ingredientes ----------
export const useIngredientSearch = (params: { q?: string; curatedOnly?: boolean; page?: number }) =>
  useQuery({
    queryKey: queryKeys.ingredients(params),
    queryFn: () =>
      api<Page<IngredientSummary>>(
        `/api/ingredients${toQueryString({ q: params.q, curatedOnly: params.curatedOnly ? 'true' : undefined, page: params.page, pageSize: 24 })}`,
      ),
    placeholderData: keepPreviousData,
  });

export const useIngredient = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.ingredient(id ?? ''),
    queryFn: () => api<IngredientDetail>(`/api/ingredients/${id}`),
    enabled: Boolean(id),
  });

export const useAnalyses = (page: number) =>
  useQuery({
    queryKey: queryKeys.analysisList(page),
    queryFn: () => api<Page<IngredientAnalysis>>(`/api/ingredient-analyses${toQueryString({ page, pageSize: 10 })}`),
    placeholderData: keepPreviousData,
  });

export const useAnalysis = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.analysis(id ?? ''),
    queryFn: () => api<IngredientAnalysis>(`/api/ingredient-analyses/${id}`),
    enabled: Boolean(id),
  });

export function useLookupIngredient() {
  const client = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (query: string) =>
      api<IngredientAnalysis>('/api/ingredient-analyses', { method: 'POST', body: { query } }),
    onSuccess: (analysis) => {
      client.setQueryData(queryKeys.analysis(analysis.id), analysis);
      return invalidate(queryKeys.analyses, queryKeys.dashboard);
    },
  });
}

export function useExplainAnalysis() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<IngredientAnalysis>(`/api/ingredient-analyses/${id}/explanation`, { method: 'POST' }),
    onSuccess: (analysis) => {
      client.setQueryData(queryKeys.analysis(analysis.id), analysis);
      return client.invalidateQueries({ queryKey: queryKeys.analyses });
    },
  });
}

// ---------- Comparações ----------
export const useComparisons = (page: number) =>
  useQuery({
    queryKey: queryKeys.comparisonList(page),
    queryFn: () => api<Page<Comparison>>(`/api/comparisons${toQueryString({ page, pageSize: 10 })}`),
    placeholderData: keepPreviousData,
  });

export const useComparison = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.comparison(id ?? ''),
    queryFn: () => api<Comparison>(`/api/comparisons/${id}`),
    enabled: Boolean(id),
  });

export function useCreateComparison() {
  const client = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { productAId: string; productBId: string }) =>
      api<Comparison>('/api/comparisons', { method: 'POST', body: input }),
    onSuccess: (comparison) => {
      client.setQueryData(queryKeys.comparison(comparison.id), comparison);
      return invalidate(queryKeys.comparisons, queryKeys.dashboard);
    },
  });
}

export function useExplainComparison() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<Comparison>(`/api/comparisons/${id}/explanation`, { method: 'POST' }),
    onSuccess: (comparison) => {
      client.setQueryData(queryKeys.comparison(comparison.id), comparison);
      return client.invalidateQueries({ queryKey: queryKeys.comparisons });
    },
  });
}

// ---------- Assistente ----------
export const useAiStatus = () =>
  useQuery({ queryKey: queryKeys.aiStatus, queryFn: () => api<AiStatus>('/api/ai/status'), staleTime: 5 * 60_000 });

export const useConversations = (page: number) =>
  useQuery({
    queryKey: queryKeys.conversationList(page),
    queryFn: () => api<Page<ConversationSummary>>(`/api/conversations${toQueryString({ page, pageSize: 20 })}`),
    placeholderData: keepPreviousData,
  });

export const useConversation = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.conversation(id ?? ''),
    queryFn: () => api<Conversation>(`/api/conversations/${id}`),
    enabled: Boolean(id),
  });

export interface SendMessageInput {
  conversationId?: string;
  message: string;
  productIds: string[];
}

export function useSendMessage() {
  const client = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ conversationId, message, productIds }: SendMessageInput) => {
      if (!conversationId) {
        return api<Conversation>('/api/conversations', { method: 'POST', body: { message, productIds } });
      }
      const result = await api<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/api/conversations/${conversationId}/messages`,
        { method: 'POST', body: { message, productIds } },
      );
      client.setQueryData<Conversation>(queryKeys.conversation(conversationId), (current) =>
        current
          ? { ...current, messages: [...current.messages, result.userMessage, result.assistantMessage] }
          : current,
      );
      return null;
    },
    onSuccess: (conversation) => {
      if (conversation) client.setQueryData(queryKeys.conversation(conversation.id), conversation);
      return invalidate(queryKeys.conversations, queryKeys.dashboard);
    },
  });
}

// ---------- Histórico ----------
export type HistoryResource = 'ingredient-analyses' | 'comparisons' | 'conversations';

const historyKeys: Record<HistoryResource, readonly unknown[]> = {
  'ingredient-analyses': queryKeys.analyses,
  comparisons: queryKeys.comparisons,
  conversations: queryKeys.conversations,
};

export function useDeleteHistoryItem(resource: HistoryResource) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/${resource}/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(historyKeys[resource], queryKeys.dashboard),
  });
}

export function useClearHistory(resource: HistoryResource) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => api<{ deleted: number }>(`/api/${resource}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(historyKeys[resource], queryKeys.dashboard),
  });
}

export const useHistoryPolicy = () =>
  useQuery({
    queryKey: queryKeys.policy,
    queryFn: () => api<HistoryPolicy>('/api/history/policy'),
    staleTime: Infinity,
  });
