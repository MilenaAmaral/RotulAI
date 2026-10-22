import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'escuro' : 'claro';
  const Icon = theme === 'light' ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Ativar modo ${nextTheme}`}
      aria-pressed={theme === 'dark'}
      title={`Ativar modo ${nextTheme}`}
      className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-soft transition-colors hover:bg-mist hover:text-graphite"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
