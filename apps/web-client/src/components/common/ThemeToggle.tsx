import { Moon, Sun, Laptop } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Laptop;

  return (
    <button
      onClick={cycleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
      title={`Tema actual: ${theme}. Click para cambiar.`}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">Cambiar tema</span>
    </button>
  );
}