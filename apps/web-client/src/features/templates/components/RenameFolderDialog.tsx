import { useState, useEffect } from 'react';
import { X, Loader2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Folder } from '../types';

interface RenameFolderDialogProps {
  isOpen: boolean;
  folder: Folder | null;
  onConfirm: (folderId: string, newName: string) => Promise<void>;
  onCancel: () => void;
}

export function RenameFolderDialog({
  isOpen,
  folder,
  onConfirm,
  onCancel,
}: RenameFolderDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && folder) {
      setName(folder.name);
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folder || !name.trim()) return;

    // Don't submit if name hasn't changed
    if (name.trim() === folder.name) {
      onCancel();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(folder.id, name.trim());
    } catch (err: unknown) {
      console.error('Failed to rename folder:', err);

      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 409) {
        setError(t('folders.create.duplicateName'));
      } else {
        setError(t('folders.edit.error'));
      }
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
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
            w-full max-w-sm bg-background rounded-lg shadow-xl
            animate-in fade-in-0 zoom-in-95
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('folders.edit.title')}</h2>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="folderName" className="block text-sm font-medium mb-1.5">
                {t('folders.create.nameLabel')}
              </label>
              <input
                id="folderName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="
                  w-full px-3 py-2 text-sm
                  border rounded-md bg-background
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
                required
                autoFocus
                onFocus={(e) => e.target.select()}
              />
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
                {t('folders.edit.button')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
