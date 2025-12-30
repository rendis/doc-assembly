/**
 * Overwrite Confirmation Dialog
 *
 * Displayed when user tries to generate AI content while the editor
 * already contains content. Warns that current content will be replaced.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';

interface OverwriteConfirmDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Callback to change open state
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Callback when user confirms overwrite
   */
  onConfirm: () => void;
}

/**
 * Dialog that confirms overwriting existing editor content
 *
 * @example
 * ```typescript
 * <OverwriteConfirmDialog
 *   open={confirmOpen}
 *   onOpenChange={setConfirmOpen}
 *   onConfirm={() => {
 *     setConfirmOpen(false);
 *     setGenerateModalOpen(true);
 *   }}
 * />
 * ```
 */
export function OverwriteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: OverwriteConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('editor.overwriteTitle', '¿Reemplazar contenido existente?')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'editor.overwriteDescription',
              'El editor contiene contenido que será reemplazado por el documento generado. Esta acción no se puede deshacer.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t('common.cancel', 'Cancelar')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('editor.overwriteConfirm', 'Continuar')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
