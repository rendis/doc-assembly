/* eslint-disable react-hooks/set-state-in-effect -- Reset state on dialog open is a standard UI pattern */
import { useState, useEffect } from 'react';
import { X, Loader2, Archive } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ArchiveConfirmDialogProps {
  isOpen: boolean;
  versionName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ArchiveConfirmDialog({
  isOpen,
  versionName,
  onConfirm,
  onCancel,
}: ArchiveConfirmDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Failed to archive version:', err);
      setError(t('templates.archive.error'));
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onCancel}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            w-full max-w-sm bg-background rounded-lg shadow-xl
            animate-in fade-in-0 zoom-in-95
          "
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t('templates.archive.title')}</h2>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {t('templates.archive.confirmMessage', { version: versionName })}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
            <button
              type="button"
              onClick={onCancel}
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
                bg-muted text-foreground rounded-md
                hover:bg-muted/80 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('templates.archive.button')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
