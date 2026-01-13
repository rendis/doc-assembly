import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type BulkAction = 'make-public' | 'remove-public'

interface BulkConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: BulkAction | null
  selectedKeys: string[]
  onConfirm: () => void
  isPending: boolean
}

export function BulkConfirmDialog({
  open,
  onOpenChange,
  action,
  selectedKeys,
  onConfirm,
  isPending,
}: BulkConfirmDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const count = selectedKeys.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm uppercase tracking-widest">
            {action === 'make-public'
              ? t('systemInjectables.bulk.confirmMakePublic', 'Make Injectables Public')
              : t('systemInjectables.bulk.confirmRemovePublic', 'Remove Public Access')}
          </DialogTitle>
          <DialogDescription>
            {action === 'make-public'
              ? t(
                  'systemInjectables.bulk.confirmMakePublicDescription',
                  'The following {{count}} injectables will be made PUBLIC:',
                  { count }
                )
              : t(
                  'systemInjectables.bulk.confirmRemovePublicDescription',
                  'PUBLIC access will be removed from the following {{count}} injectables:',
                  { count }
                )}
          </DialogDescription>
        </DialogHeader>

        {/* Keys List */}
        <div className="max-h-48 overflow-y-auto rounded-sm border border-border bg-muted/30 p-3">
          <ul className="space-y-1">
            {selectedKeys.map((key) => (
              <li key={key} className="font-mono text-xs text-muted-foreground">
                • {key}
              </li>
            ))}
          </ul>
        </div>

        {/* Warning */}
        <div
          className={cn(
            'flex items-start gap-2 rounded-sm border p-3',
            action === 'make-public'
              ? 'border-warning-border bg-warning-muted'
              : 'border-destructive/30 bg-destructive/10'
          )}
        >
          <AlertTriangle
            size={16}
            className={cn(
              'mt-0.5 shrink-0',
              action === 'make-public' ? 'text-warning' : 'text-destructive'
            )}
          />
          <p className="text-xs text-muted-foreground">
            {action === 'make-public'
              ? t(
                  'systemInjectables.bulk.warningMakePublic',
                  'PUBLIC injectables are available to ALL workspaces without explicit assignments.'
                )
              : t(
                  'systemInjectables.bulk.warningRemovePublic',
                  'Removing PUBLIC access will restrict these injectables to their scoped assignments only.'
                )}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="font-mono text-xs uppercase"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'font-mono text-xs uppercase',
              action === 'make-public'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            )}
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                {t('common.processing', 'Processing...')}
              </>
            ) : action === 'make-public' ? (
              t('systemInjectables.bulk.makePublic', 'Make Public')
            ) : (
              t('systemInjectables.bulk.removePublic', 'Remove Public')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
