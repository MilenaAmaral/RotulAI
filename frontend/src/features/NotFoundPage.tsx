import { ButtonLink } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="font-display text-[4rem] leading-none font-semibold">
        <span className="highlight">404</span>
      </p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="max-w-md text-ink-soft">
        O endereço acessado não existe ou foi removido. Volte ao catálogo para continuar.
      </p>
      <ButtonLink to="/catalogo">Voltar ao catálogo</ButtonLink>
    </div>
  );
}
