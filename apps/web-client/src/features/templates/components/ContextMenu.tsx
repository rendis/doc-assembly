import { useEffect, useRef } from 'react';
import { Pencil, Copy, FolderInput, Trash2, Eye, FolderPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { templatesApi } from '../api/templates-api';
import { foldersApi } from '../api/folders-api';
import type { TemplateListItem, FolderTree } from '../types';

interface ContextMenuProps {
  type: 'template' | 'folder';
  item: TemplateListItem | FolderTree;
  x: number;
  y: number;
  onClose: () => void;
  onRefresh: () => void;
  onMoveFolder?: (folder: FolderTree) => void;
  onCreateSubfolder?: (parentId: string) => void;
  onRenameFolder?: (folder: FolderTree) => void;
}

export function ContextMenu({ type, item, x, y, onClose, onRefresh, onMoveFolder, onCreateSubfolder, onRenameFolder }: ContextMenuProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  // Adjust position to keep menu in viewport
  const position = (() => {
    // Initial calculation, will be refined after mount
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const menuWidth = 180;
    const menuHeight = 200;

    let newX = x;
    let newY = y;

    if (x + menuWidth > viewportWidth) {
      newX = viewportWidth - menuWidth - 8;
    }
    if (y + menuHeight > viewportHeight) {
      newY = viewportHeight - menuHeight - 8;
    }

    return { x: newX, y: newY };
  })();

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleDelete = async () => {
    const confirmMessage = type === 'template'
      ? t('templates.delete.message')
      : t('folders.delete.message');

    if (!confirm(confirmMessage)) return;

    try {
      if (type === 'template') {
        await templatesApi.delete(item.id);
      } else {
        await foldersApi.delete(item.id);
      }
      onRefresh();
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
    }

    onClose();
  };

  const handleClone = async () => {
    if (type !== 'template') return;

    const template = item as TemplateListItem;
    const newTitle = prompt(t('templates.clone.newTitlePlaceholder'), `${template.title} (Copy)`);

    if (!newTitle) return;

    try {
      await templatesApi.clone(template.id, { newTitle });
      onRefresh();
    } catch (error) {
      console.error('Failed to clone template:', error);
    }

    onClose();
  };

  return (
    <div
      ref={ref}
      className="
        fixed z-50 min-w-[160px] py-1
        bg-popover border rounded-md shadow-lg
        animate-in fade-in-0 zoom-in-95
      "
      style={{ left: position.x, top: position.y }}
    >
      {type === 'template' ? (
        <>
          <MenuItem
            icon={<Eye className="w-4 h-4" />}
            label={t('templates.actions.viewVersions')}
            onClick={onClose}
          />
          <MenuItem
            icon={<Pencil className="w-4 h-4" />}
            label={t('templates.actions.edit')}
            onClick={onClose}
          />
          <MenuItem
            icon={<Copy className="w-4 h-4" />}
            label={t('templates.actions.clone')}
            onClick={handleClone}
          />
          <MenuItem
            icon={<FolderInput className="w-4 h-4" />}
            label={t('templates.actions.move')}
            onClick={onClose}
          />
          <div className="my-1 border-t" />
          <MenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label={t('templates.actions.delete')}
            onClick={handleDelete}
            variant="destructive"
          />
        </>
      ) : (
        <>
          <MenuItem
            icon={<FolderPlus className="w-4 h-4" />}
            label={t('folders.newSubfolder')}
            onClick={() => {
              if (onCreateSubfolder) {
                onCreateSubfolder(item.id);
              }
              onClose();
            }}
          />
          <MenuItem
            icon={<Pencil className="w-4 h-4" />}
            label={t('folders.edit.title')}
            onClick={() => {
              if (onRenameFolder) {
                onRenameFolder(item as FolderTree);
              }
              onClose();
            }}
          />
          <MenuItem
            icon={<FolderInput className="w-4 h-4" />}
            label={t('folders.move.title')}
            onClick={() => {
              if (onMoveFolder) {
                onMoveFolder(item as FolderTree);
              }
              onClose();
            }}
          />
          <div className="my-1 border-t" />
          <MenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label={t('folders.delete.title')}
            onClick={handleDelete}
            variant="destructive"
          />
        </>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

function MenuItem({ icon, label, onClick, variant = 'default' }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-2 w-full px-3 py-1.5 text-sm
        transition-colors
        ${variant === 'destructive'
          ? 'text-destructive hover:bg-destructive/10'
          : 'hover:bg-muted'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}
