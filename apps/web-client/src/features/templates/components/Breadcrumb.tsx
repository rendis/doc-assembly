import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Folder } from '../types';

interface BreadcrumbProps {
  path: Folder[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const { t } = useTranslation();

  return (
    <nav className="flex items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className={`
          flex items-center gap-1 px-2 py-1 rounded-md
          hover:bg-muted transition-colors
          ${path.length === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}
        `}
      >
        <Home className="w-3.5 h-3.5" />
        <span>{t('folders.root')}</span>
      </button>

      {path.map((folder, index) => {
        const isLast = index === path.length - 1;

        return (
          <div key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => onNavigate(folder.id)}
              className={`
                px-2 py-1 rounded-md
                hover:bg-muted transition-colors
                ${isLast ? 'text-foreground font-medium' : 'text-muted-foreground'}
              `}
            >
              {folder.name}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
