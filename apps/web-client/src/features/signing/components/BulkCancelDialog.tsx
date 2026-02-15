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
import type { SigningDocumentListItem } from '../types'

interface BulkCancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documents: SigningDocumentListItem[]
  isLoading: boolean
  onConfirm: () => void
}

export function BulkCancelDialog({
  open,
  onOpenChange,
  documents,
  isLoading,
  onConfirm,
}: BulkCancelDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <AlertTriangle size={18} className="text-destructive" />
            {t('signing.bulk.cancelTitle', 'Cancel Documents')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'signing.bulk.cancelConfirm',
              'Are you sure you want to cancel {{count}} documents?',
              { count: documents.length }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              {t(
                'signing.bulk.cancelWarning',
                'This action cannot be undone. All pending signatures on these documents will be cancelled.'
              )}
            </p>
          </div>

          {/* Document list */}
          <div className="max-h-40 overflow-y-auto">
            <ul className="space-y-1">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="truncate text-sm text-muted-foreground"
                >
                  {doc.title}
                </li>
              ))}
            </ul>
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
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {t('signing.bulk.cancelSelected', 'Cancel Selected')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
