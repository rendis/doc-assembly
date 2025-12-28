import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme-store';
import keycloak from '@/lib/keycloak';
import { 
  LogOut, User, Moon, Sun, Laptop, 
  Languages 
} from 'lucide-react';

export const UserMenu = () => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const currentThemeIcon = theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Laptop className="h-4 w-4" />;
  
  const userName = keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'User';
  const userEmail = keycloak.tokenParsed?.email;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-full border bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <User className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 z-50">
          
          {/* Header del usuario */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
            <p className="text-sm font-medium">{userName}</p>
            {userEmail && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
          </div>

          {/* Selector de Tema */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2">
                {currentThemeIcon}
                <span>{t('userMenu.theme')}: <span className="capitalize">{t(`theme.${theme}`)}</span></span>
            </div>
          </button>

          {/* Selector de Idioma Minimalista */}
          <div className="flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-slate-500" />
              <span>{t('userMenu.language')}</span>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-0.5">
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`px-2 py-0.5 text-xs rounded transition-all ${i18n.resolvedLanguage === 'en' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                EN
              </button>
              <button
                onClick={() => i18n.changeLanguage('es')}
                className={`px-2 py-0.5 text-xs rounded transition-all ${i18n.resolvedLanguage === 'es' ? 'bg-white dark:bg-slate-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
              >
                ES
              </button>
            </div>
          </div>

          <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

          {/* Logout */}
          <button
            onClick={() => keycloak.logout()}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4" />
            {t('common.logout')}
          </button>
        </div>
      )}
    </div>
  );
};
