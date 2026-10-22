import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ThemeProvider } from './ThemeProvider';

function renderThemeToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeToggle', () => {
  it('toggles the theme and persists the preference', () => {
    document.documentElement.dataset.theme = 'light';
    renderThemeToggle();

    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo escuro' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('rotulai-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Ativar modo claro' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores the saved theme when the provider is mounted again', () => {
    document.documentElement.dataset.theme = 'light';
    const firstRender = renderThemeToggle();
    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo escuro' }));
    firstRender.unmount();

    document.documentElement.dataset.theme = '';
    renderThemeToggle();

    expect(screen.getByRole('button', { name: 'Ativar modo claro' })).toHaveAttribute('aria-pressed', 'true');
  });
});
