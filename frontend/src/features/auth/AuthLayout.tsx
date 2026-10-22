import type { ReactNode } from 'react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Logo } from '../../components/ui/Logo';

/** Rótulo ilustrativo: mostra a ideia do produto (ler o rótulo com um marca-texto). */
function LabelIllustration() {
  return (
    <figure className="w-full max-w-md rotate-[-1.5deg] rounded-[var(--radius-panel)] border border-line bg-white p-7 shadow-[var(--shadow-lift)]">
      <figcaption className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
        <span className="font-display text-lg font-semibold">Ingredientes</span>
        <span className="text-xs text-ink-soft">rótulo ilustrativo</span>
      </figcaption>
      <p className="text-[15px] leading-[1.9] text-ink-soft">
        Aqua, <span className="highlight text-graphite">Glycerin</span>, Butylene Glycol,{' '}
        <span className="highlight text-graphite">Niacinamide</span>, Sodium Hyaluronate, Panthenol, Allantoin, Xanthan
        Gum, Phenoxyethanol, Ethylhexylglycerin.
      </p>
      <dl className="mt-6 grid gap-3 text-sm">
        <div className="flex gap-3">
          <dt className="w-24 shrink-0 font-semibold text-graphite">Glycerin</dt>
          <dd className="text-ink-soft">Umectante que ajuda a reter água na pele.</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-24 shrink-0 font-semibold text-graphite">Niacinamide</dt>
          <dd className="text-ink-soft">Forma da vitamina B3 usada como condicionante.</dd>
        </div>
      </dl>
    </figure>
  );
}

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="flex flex-col bg-white px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo animated className="text-[1.6rem]" />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-[2rem] font-semibold">{title}</h1>
          <p className="mt-2 mb-8 text-ink-soft">{subtitle}</p>
          {children}
        </div>
        <p className="text-xs text-ink-soft">
          Conteúdo educacional sobre cosméticos. Não substitui a orientação de um dermatologista.
        </p>
      </main>
      <aside className="hidden flex-col items-center justify-center gap-10 bg-mist px-12 lg:flex" aria-hidden="true">
        <LabelIllustration />
        <p className="max-w-md text-center font-display text-2xl leading-snug font-medium text-graphite">
          Entenda o que está no rótulo antes de passar no rosto.
        </p>
      </aside>
    </div>
  );
}
