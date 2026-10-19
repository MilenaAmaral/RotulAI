import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { ErrorState, Notice } from '../../components/ui/States';
import { inputClass } from '../../components/ui/styles';
import { LoadingBlock } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from '../../lib/format';
import {
  useAdminIngredients,
  useAdminProducts,
  useAdminRecommendationRules,
  useAdminSearchSynonyms,
  useDeleteAdminIngredient,
  useDeleteAdminProduct,
  useDeleteAdminRecommendationRule,
  useDeleteAdminSearchSynonym,
  useSaveAdminIngredient,
  useSaveAdminProduct,
  useSaveAdminRecommendationRule,
  useSaveAdminSearchSynonym,
} from '../../lib/queries';
import type {
  AdminProduct,
  AdminIngredientInput,
  AdminProductInput,
  AdminSearchSynonymInput,
  ProductCategory,
  RecommendationRuleInput,
  SkinConcern,
  SkinType,
} from '../../types/api';
import { api } from '../../lib/api';

const tabs = [
  ['products', 'Produtos'],
  ['ingredients', 'Ingredientes'],
  ['rules', 'Regras de indicação'],
  ['synonyms', 'Sinônimos de busca'],
] as const;

type Tab = (typeof tabs)[number][0];

function isProductCategory(value: string): value is ProductCategory {
  return Object.hasOwn(CATEGORY_LABELS, value);
}

function isSkinType(value: string): value is SkinType {
  return SKIN_TYPES.some(([option]) => option === value);
}

function isSkinConcern(value: string): value is SkinConcern {
  return CONCERNS.some(([option]) => option === value);
}

const SKIN_TYPES: Array<[SkinType, string]> = [
  ['OILY', 'Oleosa'],
  ['DRY', 'Seca'],
  ['COMBINATION', 'Mista'],
  ['SENSITIVE', 'Sensível'],
  ['NORMAL', 'Normal'],
];

const CONCERNS: Array<[SkinConcern, string]> = [
  ['ACNE_PRONE', 'Tendência acneica'],
  ['PIGMENTATION', 'Manchas'],
  ['DEHYDRATION', 'Desidratação'],
  ['SENSITIVITY', 'Sensibilidade'],
  ['SUN_PROTECTION', 'Proteção solar'],
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('products');
  return (
    <>
      <PageHeader
        title="Administração do catálogo"
        description="Gerencie o conteúdo público, a referência curada e os critérios de busca e recomendação."
      />
      <Notice title="Conteúdo educativo">
        Regras de indicação devem ter justificativa baseada em fontes confiáveis. Elas não são diagnóstico nem indicação
        de tratamento.
      </Notice>
      <div className="my-5 flex flex-wrap gap-2 border-b border-line" role="tablist" aria-label="Recursos do catálogo">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            className={`border-b-2 px-3 py-2 text-sm font-semibold ${
              tab === key ? 'border-brand-accent text-graphite' : 'border-transparent text-ink-soft hover:text-graphite'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'products' && <ProductsPanel />}
        {tab === 'ingredients' && <IngredientsPanel />}
        {tab === 'rules' && <RulesPanel />}
        {tab === 'synonyms' && <SynonymsPanel />}
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function Feedback({ error }: { error: unknown }) {
  return error ? (
    <div className="mt-3">
      <ErrorState error={error} />
    </div>
  ) : null;
}

function ProductsPanel() {
  const [q, setQ] = useState('');
  const products = useAdminProducts({ q: q || undefined, page: 1, pageSize: 50 });
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('OUTRO');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editError, setEditError] = useState<unknown>();
  const editing = products.data?.items.find((product) => product.id === editingId);
  const save = useSaveAdminProduct(editingId);
  const remove = useDeleteAdminProduct();

  const beginEdit = async (id: string) => {
    setEditingId(id);
    setEditError(undefined);
    setLoadingEdit(true);
    try {
      const product = await api<AdminProduct>(`/api/admin/products/${id}`);
      setName(product.name);
      setBrand(product.brand);
      setCategory(product.category);
      setReferenceUrl(product.referenceUrl ?? '');
      setIngredients(product.ingredients.map(({ ingredient }) => ingredient.name).join('\n'));
    } catch (error) {
      setEditError(error);
    } finally {
      setLoadingEdit(false);
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
      ingredients: ingredients
        .split(/\r?\n|,/)
        .map((value) => value.trim())
        .filter(Boolean),
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
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" loading={loadingEdit} onClick={() => void beginEdit(product.id)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Excluir ${product.brand} — ${product.name}?`)) remove.mutate(product.id);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Feedback error={remove.error} />
      </div>
      <form className="panel flex h-fit flex-col gap-4 p-5" onSubmit={submit}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{editing ? 'Editar produto' : 'Adicionar produto'}</h2>
          {editing && (
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancelar edição
            </Button>
          )}
        </div>
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
        <Field label="URL da referência (opcional)">
          <input
            className={inputClass}
            type="url"
            value={referenceUrl}
            onChange={(event) => setReferenceUrl(event.target.value)}
          />
        </Field>
        <Field label="Ingredientes (um por linha; a ordem é preservada)">
          <textarea
            className={`${inputClass} min-h-32 py-2`}
            required
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
          />
        </Field>
        <Feedback error={save.error} />
        <Button type="submit" loading={save.isPending || loadingEdit}>
          {editing ? 'Salvar alterações' : 'Criar produto'}
        </Button>
      </form>
    </div>
  );
}

function parseList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function IngredientsPanel() {
  const [q, setQ] = useState('');
  const ingredients = useAdminIngredients({ q: q || undefined, page: 1, pageSize: 50 });
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [synonyms, setSynonyms] = useState('');
  const [functions, setFunctions] = useState('');
  const [description, setDescription] = useState('');
  const [usageInfo, setUsageInfo] = useState('');
  const [cautions, setCautions] = useState('');
  const [sources, setSources] = useState('');
  const [formError, setFormError] = useState('');
  const save = useSaveAdminIngredient(editingId);
  const remove = useDeleteAdminIngredient();
  const editing = ingredients.data?.items.find((ingredient) => ingredient.id === editingId);

  const beginEdit = (id: string) => {
    const ingredient = ingredients.data?.items.find((item) => item.id === id);
    if (!ingredient) return;
    setEditingId(id);
    setName(ingredient.name);
    setSynonyms(ingredient.synonyms.join('\n'));
    setFunctions(ingredient.functions.join('\n'));
    setDescription(ingredient.description ?? '');
    setUsageInfo(ingredient.usageInfo ?? '');
    setCautions(ingredient.cautions ?? '');
    setSources(
      ingredient.sources
        .map((source) => [source.title, source.publisher, source.url, source.note ?? ''].join(' | '))
        .join('\n'),
    );
    setFormError('');
  };

  const reset = () => {
    setEditingId(undefined);
    setName('');
    setSynonyms('');
    setFunctions('');
    setDescription('');
    setUsageInfo('');
    setCautions('');
    setSources('');
    setFormError('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const sourceRows = sources.trim() ? sources.trim().split(/\r?\n/) : [];
    const parsedSources = sourceRows.map((row) => {
      const [title, publisher, url, note = ''] = row.split('|').map((part) => part.trim());
      if (!title || !publisher || !url) {
        throw new Error('Cada fonte deve usar o formato: título | publicação | URL | observação opcional.');
      }
      return { title, publisher, url, note: note || null };
    });
    const input: AdminIngredientInput = {
      name,
      synonyms: parseList(synonyms),
      functions: parseList(functions),
      description: description.trim() || null,
      usageInfo: usageInfo.trim() || null,
      cautions: cautions.trim() || null,
      sources: parsedSources,
    };
    setFormError('');
    save.mutate(input, { onSuccess: reset });
  };

  const handleSubmit = (event: FormEvent) => {
    try {
      submit(event);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Verifique os dados das fontes.');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Ingredientes da referência curada</h2>
          <input
            className={inputClass}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar ingredientes"
            aria-label="Buscar ingredientes"
          />
        </div>
        {ingredients.isLoading && <LoadingBlock label="Carregando ingredientes..." />}
        {ingredients.isError && <ErrorState error={ingredients.error} onRetry={() => void ingredients.refetch()} />}
        <ul className="flex flex-col gap-2">
          {ingredients.data?.items.map((ingredient) => (
            <li key={ingredient.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{ingredient.name}</p>
                <p className="text-sm text-ink-soft">
                  {ingredient.sources.length} fontes · {ingredient.functions.length} funções
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => beginEdit(ingredient.id)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Excluir o ingrediente ${ingredient.name}?`)) remove.mutate(ingredient.id);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Feedback error={remove.error} />
      </div>
      <form className="panel flex h-fit flex-col gap-4 p-5" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{editing ? 'Editar ingrediente' : 'Adicionar ingrediente'}</h2>
          {editing && (
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancelar edição
            </Button>
          )}
        </div>
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
        <Field label="Sinônimos (um por linha)">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={synonyms}
            onChange={(event) => setSynonyms(event.target.value)}
          />
        </Field>
        <Field label="Funções (uma por linha)">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={functions}
            onChange={(event) => setFunctions(event.target.value)}
          />
        </Field>
        <Field label="Descrição">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field label="Informações de uso">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={usageInfo}
            onChange={(event) => setUsageInfo(event.target.value)}
          />
        </Field>
        <Field label="Cuidados">
          <textarea
            className={`${inputClass} min-h-20 py-2`}
            value={cautions}
            onChange={(event) => setCautions(event.target.value)}
          />
        </Field>
        <Field label="Fontes (uma por linha: título | publicação | URL | observação opcional)">
          <textarea
            className={`${inputClass} min-h-24 py-2`}
            value={sources}
            onChange={(event) => setSources(event.target.value)}
          />
        </Field>
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Feedback error={save.error} />
        <Button type="submit" loading={save.isPending}>
          {editing ? 'Salvar alterações' : 'Criar ingrediente'}
        </Button>
      </form>
    </div>
  );
}

function RulesPanel() {
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
  const editing = rules.data?.find((rule) => rule.id === editingId);

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
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => beginEdit(rule.id)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Excluir a regra de ${rule.ingredient.name}?`)) remove.mutate(rule.id);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Feedback error={remove.error} />
      </div>
      <form className="panel flex h-fit flex-col gap-4 p-5" onSubmit={submit}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{editing ? 'Editar regra' : 'Adicionar regra'}</h2>
          {editing && (
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancelar edição
            </Button>
          )}
        </div>
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
          {editing ? 'Salvar alterações' : 'Criar regra'}
        </Button>
      </form>
    </div>
  );
}

function labelFor<T extends string>(options: Array<[T, string]>, value: T): string {
  return options.find(([key]) => key === value)?.[1] ?? value;
}

function SynonymsPanel() {
  const synonyms = useAdminSearchSynonyms();
  const [editingId, setEditingId] = useState<string>();
  const [phrase, setPhrase] = useState('');
  const [expansions, setExpansions] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const save = useSaveAdminSearchSynonym(editingId);
  const remove = useDeleteAdminSearchSynonym();
  const editing = synonyms.data?.find((item) => item.id === editingId);

  const beginEdit = (id: string) => {
    const item = synonyms.data?.find((synonym) => synonym.id === id);
    if (!item) return;
    setEditingId(id);
    setPhrase(item.phrase);
    setExpansions(item.expansions.join('\n'));
    setCategory(item.category ?? '');
  };

  const reset = () => {
    setEditingId(undefined);
    setPhrase('');
    setExpansions('');
    setCategory('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input: AdminSearchSynonymInput = {
      phrase,
      expansions: parseList(expansions),
      category: category || null,
    };
    save.mutate(input, { onSuccess: reset });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Sinônimos de busca</h2>
        {synonyms.isLoading && <LoadingBlock label="Carregando sinônimos..." />}
        {synonyms.isError && <ErrorState error={synonyms.error} onRetry={() => void synonyms.refetch()} />}
        <ul className="flex flex-col gap-2">
          {synonyms.data?.map((item) => (
            <li key={item.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {item.phrase} → {item.expansions.join(', ')}
                </p>
                <p className="text-sm text-ink-soft">
                  {item.category ? CATEGORY_LABELS[item.category] : 'Todas as categorias'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => beginEdit(item.id)}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Excluir o sinônimo “${item.phrase}”?`)) remove.mutate(item.id);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Feedback error={remove.error} />
      </div>
      <form className="panel flex h-fit flex-col gap-4 p-5" onSubmit={submit}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{editing ? 'Editar sinônimo' : 'Adicionar sinônimo'}</h2>
          {editing && (
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancelar edição
            </Button>
          )}
        </div>
        <Field label="Termo procurado">
          <input
            className={inputClass}
            required
            minLength={2}
            maxLength={120}
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
          />
        </Field>
        <Field label="Expansões (uma por linha)">
          <textarea
            className={`${inputClass} min-h-24 py-2`}
            required
            value={expansions}
            onChange={(event) => setExpansions(event.target.value)}
          />
        </Field>
        <Field label="Categoria (opcional)">
          <select
            className={inputClass}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value === '' || isProductCategory(event.target.value) ? event.target.value : '')
            }
          >
            <option value="">Todas as categorias</option>
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Feedback error={save.error} />
        <Button type="submit" loading={save.isPending}>
          {editing ? 'Salvar alterações' : 'Criar sinônimo'}
        </Button>
      </form>
    </div>
  );
}
