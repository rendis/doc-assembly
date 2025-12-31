import { useThemeStore } from '@/stores/theme-store';
import { Laptop, Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Laptop;

  return (
    <button
      onClick={cycleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 focus:outline-none"
      title={`Tema actual: ${theme}. Click para cambiar.`}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">Cambiar tema</span>
    </button>
  );
}