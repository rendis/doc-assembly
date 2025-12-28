import { useState } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { foldersApi } from '../api/folders-api';
import type { Folder } from '../types';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  parentId?: string;
  onCreated: () => void;
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  folders,
  parentId: initialParentId,
  onCreated,
}: CreateFolderDialogProps) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | undefined>(initialParentId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await foldersApi.create({
        name: name.trim(),
        parentId,
      });

      onCreated();
      handleClose();
    } catch (err: unknown) {
      console.error('Failed to create folder:', err);

      // Check for 409 Conflict (duplicate name)
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 409) {
        setError(t('folders.create.duplicateName'));
      } else {
        setError(t('folders.create.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setParentId(initialParentId);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

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
            <h2 className="text-lg font-semibold">{t('folders.create.title')}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                {t('folders.create.nameLabel')} *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('folders.create.namePlaceholder')}
                className="
                  w-full px-3 py-2 text-sm
                  border rounded-md bg-background
                  placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
                required
                autoFocus
              />
            </div>

            {/* Parent folder */}
            <div>
              <label htmlFor="parent" className="block text-sm font-medium mb-1.5">
                {t('folders.create.parentLabel')}
              </label>
              <div className="relative">
                <select
                  id="parent"
                  value={parentId ?? ''}
                  onChange={(e) => setParentId(e.target.value || undefined)}
                  className="
                    w-full px-3 py-2 text-sm appearance-none
                    border rounded-md bg-background
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  "
                >
                  <option value="">{t('folders.root')}</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
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
                type="submit"
                className="
                  flex items-center gap-2 px-4 py-2 text-sm font-medium
                  bg-primary text-primary-foreground rounded-md
                  hover:bg-primary/90 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={isSubmitting || !name.trim()}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('folders.create.button')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
