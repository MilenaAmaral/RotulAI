import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../../auth/auth-context', () => ({
  useAuth: () => ({ login }),
}));

describe('LoginPage redirect', () => {
  beforeEach(() => {
    login.mockReset();
    login.mockResolvedValue(undefined);
  });

  async function submitLogin(state: { from: string }) {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[{ pathname: '/entrar', state }]}>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/comparar" element={<p>Comparação solicitada</p>} />
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('E-mail'), 'pessoa@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha1234');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
  }

  it('returns to the originally requested internal path after login', async () => {
    await submitLogin({ from: '/comparar?aba=recentes#resultado' });

    expect(await screen.findByText('Comparação solicitada')).toBeVisible();
    expect(login).toHaveBeenCalledWith('pessoa@example.com', 'senha1234');
  });

  it('uses the dashboard instead of an external redirect destination', async () => {
    await submitLogin({ from: '//example.com/fora' });

    expect(await screen.findByText('Dashboard')).toBeVisible();
  });
});
