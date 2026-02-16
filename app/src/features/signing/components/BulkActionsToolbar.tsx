import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, RefreshCw, Loader2, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useCancelDocument, useRefreshDocument } from '../hooks/useSigningDocuments'
import { SigningDocumentStatus } from '../types'
import type { SigningDocumentListItem } from '../types'
import { BulkCancelDialog } from './BulkCancelDialog'

const CANCELLABLE_STATUSES: string[] = [
  SigningDocumentStatus.DRAFT,
  SigningDocumentStatus.PENDING_PROVIDER,
  SigningDocumentStatus.PENDING,
  SigningDocumentStatus.IN_PROGRESS,
]

interface BulkActionsToolbarProps {
  selectedDocuments: SigningDocumentListItem[]
  onClearSelection: () => void
  onActionComplete: () => void
}

export function BulkActionsToolbar({
  selectedDocuments,
  onClearSelection,
  onActionComplete,
}: BulkActionsToolbarProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const cancelMutation = useCancelDocument()
  const refreshMutation = useRefreshDocument()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  const cancellableDocs = selectedDocuments.filter((doc) =>
    CANCELLABLE_STATUSES.includes(doc.status)
  )

  const handleBulkCancel = async () => {
    setIsBulkProcessing(true)
    let successCount = 0
    let failCount = 0

    for (const doc of cancellableDocs) {
      try {
        await cancelMutation.mutateAsync(doc.id)
        successCount++
      } catch {
        failCount++
      }
    }

    setIsBulkProcessing(false)
    setShowCancelDialog(false)

    if (failCount > 0) {
      toast({
        variant: 'destructive',
        title: t('signing.bulk.partialError', 'Some operations failed'),
        description: t(
          'signing.bulk.cancelResult',
          '{{success}} cancelled, {{failed}} failed',
          { success: successCount, failed: failCount }
        ),
      })
    } else {
      toast({
        title: t(
          'signing.bulk.cancelSuccess',
          '{{count}} document(s) cancelled',
          { count: successCount }
        ),
      })
    }

    onActionComplete()
  }

  const handleBulkRefresh = async () => {
    setIsBulkProcessing(true)
    let successCount = 0
    let failCount = 0

    for (const doc of selectedDocuments) {
      try {
        await refreshMutation.mutateAsync(doc.id)
        successCount++
      } catch {
        failCount++
      }
    }

    setIsBulkProcessing(false)

    if (failCount > 0) {
      toast({
        variant: 'destructive',
        title: t('signing.bulk.partialError', 'Some operations failed'),
        description: t(
          'signing.bulk.refreshResult',
          '{{success}} refreshed, {{failed}} failed',
          { success: successCount, failed: failCount }
        ),
      })
    } else {
      toast({
        title: t(
          'signing.bulk.refreshSuccess',
          '{{count}} document(s) refreshed',
          { count: successCount }
        ),
      })
    }

    onActionComplete()
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3 md:px-6">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {t('signing.bulk.selected', '{{count}} selected', {
            count: selectedDocuments.length,
          })}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCancelDialog(true)}
            disabled={cancellableDocs.length === 0 || isBulkProcessing}
            className="inline-flex items-center gap-1.5 rounded-none border border-destructive/50 bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <Ban size={12} />
            {t('signing.bulk.cancelSelected', 'Cancel Selected')}
            {cancellableDocs.length < selectedDocuments.length && (
              <span className="text-muted-foreground">
                ({cancellableDocs.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleBulkRefresh}
            disabled={isBulkProcessing}
            className="inline-flex items-center gap-1.5 rounded-none border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {isBulkProcessing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            {t('signing.bulk.refreshSelected', 'Refresh Selected')}
          </button>
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
          title={t('signing.bulk.clearSelection', 'Clear selection')}
        >
          <X size={16} />
        </button>
      </div>

      <BulkCancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        documents={cancellableDocs}
        isLoading={isBulkProcessing}
        onConfirm={handleBulkCancel}
      />
    </>
  )
}
