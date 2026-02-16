import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/use-toast'
import { useCancelDocument } from '../hooks/useSigningDocuments'

interface CancelDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  documentTitle: string
  onSuccess?: () => void
}

export function CancelDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  onSuccess,
}: CancelDocumentDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const cancelMutation = useCancelDocument()
  const isLoading = cancelMutation.isPending

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(documentId)
      toast({
        title: t('signing.detail.cancelSuccess', 'Document cancelled'),
      })
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'signing.detail.cancelError',
          'Failed to cancel document',
        ),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <AlertTriangle size={18} className="text-destructive" />
            {t('signing.detail.cancelTitle', 'Cancel Document')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'signing.detail.cancelConfirm',
              'Are you sure you want to cancel "{{title}}"?',
              { title: documentTitle },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              {t(
                'signing.detail.cancelWarning',
                'This action cannot be undone. All pending signatures will be cancelled.',
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            disabled={isLoading}
          >
            {t('common.close', 'Close')}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {t('signing.detail.cancelConfirmBtn', 'Cancel Document')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
