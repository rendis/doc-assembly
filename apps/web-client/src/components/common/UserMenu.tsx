import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import keycloak from '@/lib/keycloak';
import { 
  LogOut, User, 
  Languages 
} from 'lucide-react';

export const UserMenu = () => {
  const { t, i18n } = useTranslation();
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

  const userName = keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'User';
  const userEmail = keycloak.tokenParsed?.email;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-foreground hover:bg-accent"
      >
        <User className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border border-border bg-popover text-popover-foreground p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          
          {/* Header del usuario */}
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-sm font-medium">{userName}</p>
            {userEmail && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
          </div>

          {/* Selector de Idioma Minimalista */}
          <div className="flex items-center justify-between px-3 py-2 text-sm text-foreground">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <span>{t('userMenu.language')}</span>
            </div>
            <div className="flex bg-muted rounded p-0.5">
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`px-2 py-0.5 text-xs rounded transition-all ${i18n.resolvedLanguage === 'en' ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                EN
              </button>
              <button
                onClick={() => i18n.changeLanguage('es')}
                className={`px-2 py-0.5 text-xs rounded transition-all ${i18n.resolvedLanguage === 'es' ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                ES
              </button>
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

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
