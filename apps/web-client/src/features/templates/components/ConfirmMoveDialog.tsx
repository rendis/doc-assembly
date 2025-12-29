/* eslint-disable react-hooks/set-state-in-effect -- Reset state on dialog open is a standard UI pattern */
import { useState, useEffect } from 'react';
import { X, Loader2, FolderInput } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmMoveDialogProps {
  isOpen: boolean;
  sourceName: string;
  targetName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ConfirmMoveDialog({
  isOpen,
  sourceName,
  targetName,
  onConfirm,
  onCancel,
}: ConfirmMoveDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens - standard dialog reset pattern
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
      console.error('Failed to move folder:', err);
      setError(t('folders.move.error'));
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onCancel}
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
              <FolderInput className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('folders.move.confirmTitle')}</h2>
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

          {/* Content */}
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {t('folders.move.confirmMessage', {
                source: sourceName,
                target: targetName,
              })}
            </p>
          </div>

          {/* Footer */}
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
