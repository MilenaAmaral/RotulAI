import { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Notice } from '../../components/ui/States';
import { IngredientsPanel } from './IngredientsPanel';
import { ProductsPanel } from './ProductsPanel';
import { RulesPanel } from './RulesPanel';
import { SynonymsPanel } from './SynonymsPanel';

const tabs = [
  ['products', 'Produtos'],
  ['ingredients', 'Ingredientes'],
  ['rules', 'Regras de indicação'],
  ['synonyms', 'Sinônimos de busca'],
] as const;

type Tab = (typeof tabs)[number][0];

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
