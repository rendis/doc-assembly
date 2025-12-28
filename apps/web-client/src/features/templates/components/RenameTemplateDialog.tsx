import { useState, useEffect } from 'react';
import { X, Loader2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RenameableTemplate {
  id: string;
  title: string;
}

interface RenameTemplateDialogProps {
  isOpen: boolean;
  template: RenameableTemplate | null;
  onConfirm: (templateId: string, newTitle: string) => Promise<void>;
  onCancel: () => void;
}

export function RenameTemplateDialog({
  isOpen,
  template,
  onConfirm,
  onCancel,
}: RenameTemplateDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && template) {
      setTitle(template.title);
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen, template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !title.trim()) return;

    // Don't submit if title hasn't changed
    if (title.trim() === template.title) {
      onCancel();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(template.id, title.trim());
    } catch (err: unknown) {
      console.error('Failed to rename template:', err);

      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 409) {
        setError(t('templates.rename.duplicateName'));
      } else {
        setError(t('templates.rename.error'));
      }
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setError(null);
    onCancel();
  };

  if (!isOpen || !template) return null;

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
              <h2 className="text-lg font-semibold">{t('templates.rename.title')}</h2>
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
              <label htmlFor="templateTitle" className="block text-sm font-medium mb-1.5">
                {t('templates.rename.titleLabel')}
              </label>
              <input
                id="templateTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="
                  w-full px-3 py-2 text-sm
                  border rounded-md bg-background
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                "
                required
                maxLength={255}
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
                disabled={isSubmitting || !title.trim()}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('templates.rename.button')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
