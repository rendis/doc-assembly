import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useCanAccessAdmin } from '@/features/auth/hooks/useCanAccessAdmin';
import { Shield, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConsoleMode = 'admin' | 'app';

export const ConsoleSwitch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { canAccessAdmin } = useCanAccessAdmin();

  // Don't render if user can't access admin
  if (!canAccessAdmin) {
    return null;
  }

  const currentMode: ConsoleMode = location.pathname.startsWith('/admin') ? 'admin' : 'app';

  const handleSwitch = (mode: ConsoleMode) => {
    if (mode === currentMode) return;

    if (mode === 'admin') {
      navigate({ to: '/admin' });
    } else {
      navigate({ to: '/' });
    }
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      <button
        onClick={() => handleSwitch('admin')}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          currentMode === 'admin'
            ? "bg-purple-600 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <Shield className="h-4 w-4" />
        <span className="hidden sm:inline">{t('navigation.admin')}</span>
      </button>
      <button
        onClick={() => handleSwitch('app')}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          currentMode === 'app'
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">{t('navigation.app')}</span>
      </button>
    </div>
  );
};
