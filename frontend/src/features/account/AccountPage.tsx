import { useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TextField } from '../../components/ui/Field';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState } from '../../components/ui/States';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useHistoryPolicy } from '../../lib/queries';

export function AccountPage() {
  const { user, logout, clearSession } = useAuth();
  const policy = useHistoryPolicy();
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api<void>('/api/auth/me', { method: 'DELETE', body: { password } });
      clearSession();
    } catch (err) {
      setError(err);
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader title="Minha conta" />
      <div className="flex max-w-2xl flex-col gap-6">
        <section className="panel p-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink-soft">Nome</dt>
              <dd className="font-semibold">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">E-mail</dt>
              <dd className="font-semibold break-all">{user?.email}</dd>
            </div>
            {user?.createdAt && (
              <div>
                <dt className="text-sm text-ink-soft">Conta criada em</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
            )}
          </dl>
          <Button variant="secondary" className="mt-5" onClick={() => void logout()}>
            Sair da conta
          </Button>
        </section>

        {policy.data && (
          <section className="panel p-5 sm:p-6">
            <h2 className="mb-2 text-lg font-semibold">Seus dados</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
              {policy.data.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>
        )}

        <section
          aria-labelledby="excluir-conta"
          className="rounded-[var(--radius-panel)] border border-[#fecdca] bg-white p-5 sm:p-6"
        >
          <h2 id="excluir-conta" className="text-lg font-semibold">
            Excluir conta
          </h2>
          <p className="mt-1 mb-4 text-ink-soft">
            Remove permanentemente sua conta, produtos, consultas, comparações e conversas. Esta ação não pode ser
            desfeita.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (password) setConfirming(true);
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <TextField
                label="Confirme sua senha"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" variant="danger" disabled={!password}>
              Excluir minha conta
            </Button>
          </form>
          {error !== null && (
            <div className="mt-3">
              <ErrorState error={error} />
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Excluir sua conta?"
        description="Todos os seus dados serão apagados permanentemente."
        confirmLabel="Excluir definitivamente"
        loading={deleting}
        onConfirm={() => void deleteAccount()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
