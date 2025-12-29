/* eslint-disable react-hooks/set-state-in-effect -- Reset state on dialog open is a standard UI pattern */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Loader2, ChevronDown, FolderInput } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Folder, FolderTree } from '../types';

interface MoveFolderDialogProps {
  isOpen: boolean;
  folder: Folder | null;
  folders: FolderTree[];
  flatFolders: Folder[];
  onConfirm: (folderId: string, newParentId: string | undefined) => Promise<void>;
  onCancel: () => void;
}

export function MoveFolderDialog({
  isOpen,
  folder,
  folders,
  flatFolders,
  onConfirm,
  onCancel,
}: MoveFolderDialogProps) {
  const { t } = useTranslation();
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedParentId(undefined);
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  // Get all descendant IDs of a folder (to prevent moving to a child)
  const getDescendantIds = useCallback((folderId: string): Set<string> => {
    const descendants = new Set<string>();

    const traverse = (nodes: FolderTree[]) => {
      for (const node of nodes) {
        if (node.parentId === folderId || descendants.has(node.parentId ?? '')) {
          descendants.add(node.id);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };

    // Need multiple passes to catch all nested descendants
    for (let i = 0; i < 10; i++) {
      traverse(folders);
    }

    return descendants;
  }, [folders]);

  // Filter out invalid destinations (self and descendants)
  const validDestinations = useMemo(() => {
    if (!folder) return flatFolders;

    const descendantIds = getDescendantIds(folder.id);
    return flatFolders.filter(
      (f) => f.id !== folder.id && !descendantIds.has(f.id)
    );
  }, [folder, flatFolders, getDescendantIds]);

  const handleConfirm = async () => {
    if (!folder) return;

    // Prevent moving to current parent
    if (selectedParentId === folder.parentId) {
      setError(t('folders.move.sameLocation'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(folder.id, selectedParentId);
    } catch (err) {
      console.error('Failed to move folder:', err);
      setError(t('folders.move.error'));
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedParentId(undefined);
    setError(null);
    onCancel();
  };

  if (!isOpen || !folder) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            w-full max-w-md bg-background rounded-lg shadow-xl
            animate-in fade-in-0 zoom-in-95
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <FolderInput className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('folders.move.title')}</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            {/* Current folder info */}
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground mb-1">{t('folders.move.moving')}</p>
              <p className="font-medium">{folder.name}</p>
            </div>

            {/* Destination selector */}
            <div>
              <label htmlFor="destination" className="block text-sm font-medium mb-1.5">
                {t('folders.move.targetLabel')}
              </label>
              <div className="relative">
                <select
                  id="destination"
                  value={selectedParentId ?? ''}
                  onChange={(e) => setSelectedParentId(e.target.value || undefined)}
                  className="
                    w-full px-3 py-2 text-sm appearance-none
                    border rounded-md bg-background
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  "
                >
                  <option value="">{t('folders.move.toRoot')}</option>
                  {validDestinations.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
            <button
              type="button"
              onClick={handleClose}
              className="
                px-4 py-2 text-sm font-medium
                border rounded-md
                hover:bg-muted transition-colors
              "
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="
                flex items-center gap-2 px-4 py-2 text-sm font-medium
                bg-primary text-primary-foreground rounded-md
                hover:bg-primary/90 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('folders.move.button')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
