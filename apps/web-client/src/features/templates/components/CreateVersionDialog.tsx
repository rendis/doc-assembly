import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { versionsApi } from '../api/versions-api';

interface CreateVersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  onCreated: () => void;
}

export function CreateVersionDialog({
  isOpen,
  onClose,
  templateId,
  onCreated,
}: CreateVersionDialogProps) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await versionsApi.create(templateId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      onCreated();
      handleClose();
    } catch (err) {
      console.error('Failed to create version:', err);
      setError(t('templates.versionCreate.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
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
            <h2 className="text-lg font-semibold">
              {t('templates.versionCreate.title')}
            </h2>
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
              <label htmlFor="version-name" className="block text-sm font-medium mb-1.5">
                {t('templates.versionCreate.nameLabel')} *
              </label>
              <input
                id="version-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('templates.versionCreate.namePlaceholder')}
                maxLength={100}
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

            {/* Description */}
            <div>
              <label htmlFor="version-description" className="block text-sm font-medium mb-1.5">
                {t('templates.versionCreate.descriptionLabel')}
              </label>
              <textarea
                id="version-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('templates.versionCreate.descriptionPlaceholder')}
                rows={3}
                className="
                  w-full px-3 py-2 text-sm
                  border rounded-md bg-background
                  placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  resize-none
                "
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
                {t('templates.versionCreate.button')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
